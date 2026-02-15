// ... جميع الاستيرادات كما هي
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../../context/CartContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WebView } from "react-native-webview";
import axios from "axios";

const BASE_URL = "https://back-end-nodejs-production-fdc5.up.railway.app";

// URI لصورة Delvry للخريطة (إن وُجدت)
let delvryMarkerIconUri = null;
try {
  const resolved = Image.resolveAssetSource?.(require("../../assets/images/d.jpg"));
  if (resolved?.uri) delvryMarkerIconUri = resolved.uri;
} catch (_) {}

export default function Cared() {
  const { cartItems, removeFromCart, updateQuantity, totalPrice, clearCart } =
    useCart();

  const [email, setEmail] = useState(null);
  const [phone, setPhone] = useState(null);
  const [location, setLocation] = useState(null);
  const [name, setName] = useState(null);
  const [itemsData, setItemsData] = useState([]);
  const [orderStatus, setOrderStatus] = useState(null);
  const [delverData, setDelverData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orderedItems, setOrderedItems] = useState([]);
  const [orderedTotal, setOrderedTotal] = useState(0);
  const [showEmptyMessage, setShowEmptyMessage] = useState(false);
  const [quantityError, setQuantityError] = useState({}); 

  const markerWebViewRef = useRef(null);

  // مسافة بين نقطتين (بالأمتار) - Haversine
  const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3;
    const rad = (x) => (x * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  let clientLat = 0, clientLng = 0;
  if (location) {
    const parts = location.split(",").map((s) => parseFloat(s.trim(), 10));
    if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      clientLat = parts[0];
      clientLng = parts[1];
    }
  }

  // ================= USER DATA =================
  useEffect(() => {
    const fetchUserData = async () => {
      const storedEmail = await AsyncStorage.getItem("email");
      const storedPhone = await AsyncStorage.getItem("phone");
      const storedLocation = await AsyncStorage.getItem("location");
      const storedName = await AsyncStorage.getItem("name");
      const storedOrderStatus = await AsyncStorage.getItem("orderStatus");
      const storedDelver = await AsyncStorage.getItem("delverData");

      setEmail(storedEmail);
      setPhone(storedPhone);
      setLocation(storedLocation);
      setName(storedName);
      setItemsData(cartItems.map((item) => ({ ...item })));
      setOrderStatus(storedOrderStatus);
      if (storedDelver) setDelverData(JSON.parse(storedDelver));

      setIsLoading(false);
    };
    fetchUserData();
  }, [cartItems]);

  // عند إضافة منتجات بعد تفريغ السلة → إخفاء رسالة السلة الفارغة
  useEffect(() => {
    if (cartItems.length > 0 && showEmptyMessage) setShowEmptyMessage(false);
  }, [cartItems.length, showEmptyMessage]);

  // ================= ORDER =================
  const handleOrder = async () => {
    if (!email || !phone || !location || cartItems.length === 0) return;

    try {
      setOrderedItems(cartItems);
      setOrderedTotal(totalPrice);

      const res = await axios.post(`${BASE_URL}/api/order/create`, {
        name,
        email,
        phone,
        location,
        items: cartItems,
        totalPrice,
      });

      if (res.data.success) {
        setOrderStatus("pending");
        AsyncStorage.setItem("orderStatus", "pending"); // تخزين الحالة
        setShowEmptyMessage(false);
      }
    } catch (err) {
      console.log(err);
    }
  };

  // ================= QUANTITY HANDLERS =================
  const handleIncrease = (item) => {
    const availableQty = item.quantityAvailable ?? 0;
    if (item.quantity + 1 > availableQty) {
      setQuantityError((prev) => ({
        ...prev,
        [item.uniqueId]: "❌ الكمية غير متوفرة",
      }));
      return;
    }
    setQuantityError((prev) => ({ ...prev, [item.uniqueId]: null }));
    updateQuantity(item.uniqueId, item.quantity + 1);
  };

  const handleDecrease = (item) => {
    if (item.quantity - 1 < 1) return;
    updateQuantity(item.uniqueId, item.quantity - 1);
    setQuantityError((prev) => ({ ...prev, [item.uniqueId]: null }));
  };

  // ================= DELVER TRACK =================
  // كل 3 ثوان: جلب موقع المندوب، تحديث الخريطة، وإذا اقترب من العميل ≤20م → تم التوصيل
  useEffect(() => {
    if (!orderStatus || !name || !phone || !location) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/api/delver/accepted-info?clientName=${encodeURIComponent(name)}&clientPhone=${encodeURIComponent(phone)}`
        );

        if (res.data.success && res.data.delver) {
          const { delver } = res.data;
          let loc = delver.currentLocation || delver.acceptedLocation;
          if (loc && typeof loc === "string") {
            const p = loc.split(",").map((s) => parseFloat(s.trim(), 10));
            if (p.length >= 2) loc = { latitude: p[0], longitude: p[1] };
          }

          const delverObj = {
            name: delver.name,
            phone: delver.phone,
            location: loc && typeof loc === "object" && loc.latitude != null && loc.longitude != null ? loc : null,
          };

          setDelverData(delverObj);
          AsyncStorage.setItem("delverData", JSON.stringify(delverObj));

          if (orderStatus === "pending") {
            setOrderStatus("preparing");
            AsyncStorage.setItem("orderStatus", "preparing");
          }

          // تحديث موقع المندوب على الخريطة (يتحرك كل 3 ثوان حسب موقع الهاتف)
          const dLat = delver.currentLocation?.latitude;
          const dLng = delver.currentLocation?.longitude;
          if (markerWebViewRef.current && dLat != null && dLng != null) {
            const delverNameEsc = (delver.name || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, " ");
            try {
              markerWebViewRef.current.injectJavaScript(
                `if (window.updateDelver) window.updateDelver(${Number(dLat)}, ${Number(dLng)}, '${delverNameEsc}'); true;`
              );
            } catch (_) {}
          }

          // إذا المندوب على بعد ≤20 متر من موقع العميل → تم التوصيل (أيقونة صح أخضر)
          const parts = location.split(",").map((s) => parseFloat(s.trim(), 10));
          if (
            parts.length >= 2 &&
            !Number.isNaN(parts[0]) &&
            !Number.isNaN(parts[1]) &&
            dLat != null &&
            dLng != null
          ) {
            const distanceM = getDistanceMeters(parts[0], parts[1], dLat, dLng);
            if (distanceM <= 20) {
              setOrderStatus("delivered");
              AsyncStorage.setItem("orderStatus", "delivered");
            }
          }
        }
      } catch (_err) {
        console.log("لم يتم قبول الطلب بعد");
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderStatus, name, phone, location]);

  // إنشاء HTML الخريطة (بعد تحميل Leaflet يظهر المندوب)
  const getMapHtml = () => {
    let dLat = delverData?.location?.latitude;
    let dLng = delverData?.location?.longitude;
    if ((dLat == null || dLng == null) && typeof delverData?.location === "string") {
      const parts = delverData.location.split(",").map((s) => parseFloat(s.trim(), 10));
      if (parts.length >= 2) {
        dLat = parts[0];
        dLng = parts[1];
      }
    }
    const hasInitialDelver = typeof dLat === "number" && typeof dLng === "number";
    const delverNameEscaped = (delverData?.name ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
    const delverIconContent = delvryMarkerIconUri
      ? "<img src=\"" + String(delvryMarkerIconUri).replace(/"/g, "&quot;") + "\" class=\"delver-img\" alt=\"Delvry\"/>"
      : "<span class=\"delver-d\">D</span>";
    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body { margin:0; padding:0; height:100%; } #map { width:100%; height:100%; }
    .delver-marker { background: none !important; border: none !important; }
    .delver-pin { width: 44px; height: 44px; position: relative; }
    .delver-pin-inner {
      width: 44px; height: 44px; border-radius: 50%;
      background: linear-gradient(135deg, #00E5FF 0%, #0097b3 100%);
      box-shadow: 0 3px 12px rgba(0,229,255,0.5), 0 2px 6px rgba(0,0,0,0.25);
      display: flex; align-items: center; justify-content: center;
      border: 3px solid white;
    }
    .delver-d { color: white; font-size: 20px; font-weight: 800; font-family: system-ui, sans-serif; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }
    .delver-img { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    function initMap() {
      if (typeof L === 'undefined') return;
      var map = L.map('map').setView([${clientLat}, ${clientLng}], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      L.marker([${clientLat}, ${clientLng}]).addTo(map).bindPopup('موقعك');
      var delverIcon = L.divIcon({
        className: 'delver-marker',
        html: '<div class="delver-pin"><div class="delver-pin-inner">${delverIconContent.replace(/'/g, "\\\\'")}</div></div>',
        iconSize: [44, 44],
        iconAnchor: [22, 44],
      });
      var delverMarker = null;
      function updateDelver(lat, lng, name) {
        if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return;
        if (!delverMarker) {
          delverMarker = L.marker([lat, lng], { icon: delverIcon }).addTo(map).bindPopup("<b>Delvry</b><br>" + (name || "مندوب"));
          delverMarker.openPopup();
        } else {
          delverMarker.setLatLng([lat, lng]);
        }
      }
      window.updateDelver = updateDelver;
      ${hasInitialDelver ? `updateDelver(${dLat}, ${dLng}, "${delverNameEscaped}");` : ""}
    }
    window.addEventListener('load', initMap);
  </script>
</body>
</html>`;
  };

  // ================= STATUS STEPPER (حديث) =================
  const STEPS = [
    { key: "pending", label: "يتم التجهيز", icon: "time-outline" },
    { key: "preparing", label: "تم التجهيز", icon: "restaurant-outline" },
    { key: "delivered", label: "تم التوصيل", icon: "checkmark-done-outline" },
  ];

  const getStepStatus = (stepKey) => {
    if (orderStatus === "delivered") return "completed";
    if (orderStatus === "preparing") {
      if (stepKey === "pending" || stepKey === "preparing") return "completed";
      return "pending";
    }
    if (orderStatus === "pending") {
      if (stepKey === "pending") return "active";
      return "pending";
    }
    return "pending";
  };

  const StatusStepper = () => (
    <View style={styles.statusCard}>
      <View style={styles.statusCardHeader}>
        <Ionicons name="list-outline" size={20} color="#00E5FF" />
        <Text style={styles.statusCardTitle}>حالة الطلب</Text>
      </View>
      <View style={styles.statusStepperRow}>
        {STEPS.map((step, index) => {
          const status = getStepStatus(step.key);
          const isCompleted = status === "completed";
          const isActive = status === "active";
          const isPending = status === "pending";
          const showLineAfter = index < STEPS.length - 1;
          const lineDone = showLineAfter && (isCompleted || getStepStatus(STEPS[index + 1].key) === "completed");

          return (
            <View key={step.key} style={styles.statusStepWrapper}>
              <View style={styles.statusStepContent}>
                <View style={styles.statusSpacer} />
                <View
                  style={[
                    styles.statusCircle,
                    isCompleted && styles.statusCircleCompleted,
                    isActive && styles.statusCircleActive,
                    isPending && styles.statusCirclePending,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  ) : (
                    <Ionicons
                      name={step.icon}
                      size={18}
                      color={isActive ? "#fff" : "#64748b"}
                    />
                  )}
                </View>
                {showLineAfter ? (
                  <View style={styles.statusLineContainer}>
                    <View
                      style={[
                        styles.statusLine,
                        lineDone ? styles.statusLineDone : styles.statusLinePending,
                      ]}
                    />
                  </View>
                ) : (
                  <View style={styles.statusSpacer} />
                )}
              </View>
              <Text
                style={[
                  styles.statusLabel,
                  isCompleted && styles.statusLabelCompleted,
                  isActive && styles.statusLabelActive,
                  isPending && styles.statusLabelPending,
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color="#00E5FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ===================== سلة فارغة بعد OK ===================== */}
      {showEmptyMessage && cartItems.length === 0 && (
        <View style={styles.emptyCartBox}>
          <Text style={styles.emptyCartTitle}>السلة فارغة</Text>
          <Text style={styles.emptyCartSubtext}>أضف منتجات من القائمة واطلب من جديد</Text>
        </View>
      )}

      {/* ===================== قائمة السلة ===================== */}
      {!orderStatus && cartItems.length > 0 && !showEmptyMessage && (
        <>
          <Text style={styles.title}>🛒 السلة</Text>

          <FlatList
            data={itemsData}
            keyExtractor={(item) => item.uniqueId}
            contentContainerStyle={styles.cartListContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Image
                  source={{
                    uri: item.image?.startsWith?.("http")
                      ? item.image
                      : `${BASE_URL}${item.image}`,
                  }}
                  style={styles.image}
                />

                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardPrice}>
                    {item.price * item.quantity} د.ع
                  </Text>

                  <View style={styles.qtyContainer}>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => handleDecrease(item)}
                    >
                      <Ionicons name="remove" size={18} color="#fff" />
                    </Pressable>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => handleIncrease(item)}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                    </Pressable>
                  </View>

                  {quantityError[item.uniqueId] && (
                    <Text style={styles.quantityErrorText}>
                      {quantityError[item.uniqueId]}
                    </Text>
                  )}
                </View>

                <Pressable
                  onPress={() => removeFromCart(item.uniqueId)}
                  style={styles.removeBtn}
                >
                  <Ionicons name="trash-outline" size={24} color="#f87171" />
                </Pressable>
              </View>
            )}
          />

          <Pressable style={styles.orderBtn} onPress={handleOrder}>
            <Text style={styles.orderBtnText}>اطلب</Text>
          </Pressable>
        </>
      )}

      {/* ===================== انتظار قبول الطلب ===================== */}
      {orderStatus && location && !delverData && (
        <View style={styles.mapContainer}>
          <View style={styles.waitingBox}>
            <Ionicons name="time-outline" size={48} color="#00E5FF" />
            <Text style={styles.waitingText}>في انتظار قبول المندوب للطلب</Text>
            <Text style={styles.waitingSubtext}>ستظهر الخريطة وموقع المندوب بعد القبول</Text>
          </View>
          <StatusStepper />
        </View>
      )}

      {/* ===================== خريطة المندوب + سكرول للشاشة بالكامل ===================== */}
      {orderStatus && location && delverData && (
        <View style={styles.mapContainer}>
          <ScrollView
            style={styles.mainScroll}
            contentContainerStyle={styles.mainScrollContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={{ height: 300 }}>
              <WebView
                ref={markerWebViewRef}
                originWhitelist={["*"]}
                source={{
                  html: getMapHtml(),
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
              />
            </View>

            <StatusStepper />

            {/* معلومات المندوب + منتجات الطلب */}
            {delverData && (
              <View style={styles.delverInfo}>
                <Text style={styles.delverText}>🚚 المندوب: {delverData.name}</Text>
                <Pressable
                  onPress={() =>
                    delverData.phone && Linking.openURL(`tel:${delverData.phone}`)
                  }
                  style={styles.phonePressable}
                >
                  <Text style={styles.delverPhone}>
                    📞 {delverData.phone || "غير متوفر"}
                  </Text>
                </Pressable>

                {/* منتجات الطلب — سكرول لمشاهدة كل المنتجات (حتى 100+) */}
                {orderedItems.length > 0 && (
                  <View style={styles.orderSummarySection}>
                    <View style={styles.orderSummaryHeader}>
                      <Ionicons name="receipt-outline" size={22} color="#00E5FF" />
                      <Text style={styles.orderSummaryTitle}>
                        منتجات طلبك ({orderedItems.length})
                      </Text>
                    </View>

                    <View style={styles.orderProductsScrollWrap}>
                      <ScrollView
                        style={styles.orderProductsScroll}
                        contentContainerStyle={styles.orderProductsScrollContent}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                      >
                        {orderedItems.map((item) => (
                          <View key={item.uniqueId} style={styles.orderProductCard}>
                            <Image
                              source={{
                                uri: item.image?.startsWith("http")
                                  ? item.image
                                  : `${BASE_URL}${item.image}`,
                              }}
                              style={styles.orderProductImage}
                            />
                            <View style={styles.orderProductDetails}>
                              <Text style={styles.orderProductName} numberOfLines={2}>
                                {item.title}
                              </Text>
                              <Text style={styles.orderProductMeta}>
                                {item.quantity} × {item.price?.toLocaleString?.() ?? item.price} د.ع
                              </Text>
                              <Text style={styles.orderProductTotal}>
                                {item.price * item.quantity} د.ع
                              </Text>
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={styles.orderTotalRow}>
                      <Text style={styles.orderTotalLabel}>المجموع الكلي</Text>
                      <Text style={styles.orderTotalValue}>
                        {orderedTotal?.toLocaleString?.() ?? orderedTotal} د.ع
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* زر OK — لا يعمل إلا بعد "تم التوصيل"، عند الضغط سلة فارغة وطلب من جديد */}
            <Pressable
              style={[
                styles.okBtn,
                orderStatus !== "delivered" && styles.okBtnDisabled,
              ]}
              onPress={() => {
                if (orderStatus !== "delivered") return;
                clearCart();
                setOrderStatus(null);
                setDelverData(null);
                setOrderedItems([]);
                setOrderedTotal(0);
                AsyncStorage.removeItem("orderStatus");
                AsyncStorage.removeItem("delverData");
                setShowEmptyMessage(true);
              }}
              disabled={orderStatus !== "delivered"}
            >
              <Text
                style={[
                  styles.okText,
                  orderStatus !== "delivered" && styles.okTextDisabled,
                ]}
              >
                {orderStatus === "delivered" ? "OK" : "بانتظار التوصيل"}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1e1b4b", padding: 20 },
  title: { color: "#00E5FF", fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  cartListContent: { paddingBottom: 16 },
  card: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.8)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.1)",
  },
  image: { width: 64, height: 64, borderRadius: 12 },
  cardContent: { flex: 1, marginLeft: 14 },
  cardTitle: { color: "#fff", fontSize: 15, fontWeight: "600", marginBottom: 4 },
  cardPrice: { color: "#00E5FF", fontSize: 15, fontWeight: "700", marginBottom: 6 },
  text: { color: "#fff" },
  quantityErrorText: { color: "#f87171", fontSize: 12, marginTop: 2 },
  removeBtn: { padding: 6 },
  orderBtn: {
    backgroundColor: "#00E5FF",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  orderBtnText: { color: "#fff", fontWeight: "bold" },
  mapContainer: { marginTop: 20, flex: 1 },
  mainScroll: { flex: 1 },
  mainScrollContent: { paddingBottom: 40 },
  orderProductsScrollWrap: { height: 320, marginVertical: 8 },
  orderProductsScrollContent: { paddingBottom: 16 },
  statusCard: {
    marginTop: 16,
    backgroundColor: "rgba(17, 24, 39, 0.9)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.12)",
  },
  statusCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  statusCardTitle: {
    color: "#00E5FF",
    fontSize: 16,
    fontWeight: "700",
  },
  statusStepperRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  statusStepWrapper: {
    flex: 1,
    alignItems: "center",
  },
  statusStepContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusSpacer: { flex: 1 },
  statusCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCirclePending: {
    backgroundColor: "rgba(100, 116, 139, 0.25)",
    borderWidth: 2,
    borderColor: "rgba(100, 116, 139, 0.5)",
  },
  statusCircleActive: {
    backgroundColor: "#00E5FF",
    borderWidth: 0,
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  statusCircleCompleted: {
    backgroundColor: "#10b981",
    borderWidth: 0,
  },
  statusLineContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusLine: {
    width: "100%",
    height: 3,
    borderRadius: 2,
  },
  statusLinePending: {
    backgroundColor: "rgba(100, 116, 139, 0.35)",
  },
  statusLineDone: {
    backgroundColor: "#10b981",
  },
  statusLabel: {
    marginTop: 20,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  statusLabelPending: { color: "#cbd5e1" },
  statusLabelActive: { color: "#00E5FF" },
  statusLabelCompleted: { color: "#34d399" },
  okBtn: {
    marginTop: 20,
    backgroundColor: "#00E5FF",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  okBtnDisabled: {
    backgroundColor: "rgba(100, 116, 139, 0.5)",
    opacity: 0.85,
  },
  okText: { color: "#fff", fontWeight: "bold" },
  okTextDisabled: { color: "#cbd5e1" },
  emptyCartBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyCartTitle: {
    color: "#00E5FF",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptyCartSubtext: {
    color: "#94a3b8",
    fontSize: 15,
  },
  delverInfo: {
    marginTop: 15,
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    overflow: "hidden",
  },
  phonePressable: { marginTop: 6 },
  delverText: { color: "#00E5FF", fontSize: 17, fontWeight: "bold" },
  delverPhone: { color: "#a5b4fc", fontSize: 15 },
  orderSummarySection: {
    marginTop: 16,
    width: "100%",
    backgroundColor: "rgba(0, 229, 255, 0.06)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.15)",
  },
  orderSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  orderSummaryTitle: {
    color: "#00E5FF",
    fontSize: 16,
    fontWeight: "700",
  },
  orderProductsScroll: { flex: 1 },
  orderProductCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 27, 75, 0.6)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  orderProductImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#1e1b4b",
  },
  orderProductDetails: { flex: 1, marginLeft: 12 },
  orderProductName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  orderProductMeta: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 2,
  },
  orderProductTotal: {
    color: "#00E5FF",
    fontSize: 14,
    fontWeight: "700",
  },
  orderTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 229, 255, 0.2)",
  },
  orderTotalLabel: { color: "#c4b5fd", fontSize: 15, fontWeight: "600" },
  orderTotalValue: { color: "#00E5FF", fontSize: 18, fontWeight: "bold" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  waitingBox: {
    backgroundColor: "#111827",
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  waitingText: { color: "#00E5FF", fontSize: 18, fontWeight: "bold", marginTop: 10 },
  waitingSubtext: { color: "#94a3b8", fontSize: 14, marginTop: 6 },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  qtyBtn: {
    backgroundColor: "#00E5FF",
    padding: 5,
    borderRadius: 5,
  },
  qtyText: { color: "#fff", marginHorizontal: 10, fontSize: 16 },
});
