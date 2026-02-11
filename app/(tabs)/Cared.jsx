import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../../context/CartContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { Marker, AnimatedRegion } from "react-native-maps";
import axios from "axios";

const BASE_URL = "https://back-end-nodejs-production-fdc5.up.railway.app";

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
  const [showOk, setShowOk] = useState(false);

  const [orderedItems, setOrderedItems] = useState([]);
  const [orderedTotal, setOrderedTotal] = useState(0);
  const [showEmptyMessage, setShowEmptyMessage] = useState(false);

  const [quantityError, setQuantityError] = useState({}); // لتخزين رسائل الخطأ لكل منتج

  const markerRef = useRef(null);

  let clientLat = 0,
    clientLng = 0;
  if (location) [clientLat, clientLng] = location.split(",").map(Number);

  const [delverRegion] = useState(
    new AnimatedRegion({
      latitude: clientLat,
      longitude: clientLng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    })
  );

  // ================= USER DATA =================
  useEffect(() => {
    const fetchUserData = async () => {
      setEmail(await AsyncStorage.getItem("email"));
      setPhone(await AsyncStorage.getItem("phone"));
      setLocation(await AsyncStorage.getItem("location"));
      setName(await AsyncStorage.getItem("name"));
      setItemsData(cartItems.map((item) => ({ ...item })));
      setIsLoading(false);
    };
    fetchUserData();
  }, [cartItems]);

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
        setShowEmptyMessage(false);
      }
    } catch (err) {
      console.log(err);
    }
  };

  // ================= DISTANCE =================
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // ================= DELVER TRACK =================
  useEffect(() => {
    if (!orderStatus || !name || !phone) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/api/delver/accepted-info?clientName=${name}&clientPhone=${phone}`
        );

        if (res.data.success) {
          const { delver } = res.data;

          setDelverData({
            name: delver.name,
            phone: delver.phone,
            location: delver.currentLocation,
          });

          if (orderStatus === "pending") {
            setOrderStatus("preparing");
          }

          if (delver.currentLocation?.latitude && markerRef.current) {
            delverRegion.timing({
              latitude: delver.currentLocation.latitude,
              longitude: delver.currentLocation.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }).start();

            const distance = getDistance(
              delver.currentLocation.latitude,
              delver.currentLocation.longitude,
              clientLat,
              clientLng
            );

            if (distance < 10) {
              setOrderStatus("delivered");
              setShowOk(true);
            }
          }
        }
      } catch (err) {
        console.log("خطأ جلب موقع المندوب");
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [orderStatus, name, phone]);

  // ================= STATUS ICON =================
  const StatusIcon = ({ step }) => {
    const active =
      (orderStatus === "pending" && step === "pending") ||
      (orderStatus === "preparing" &&
        (step === "pending" || step === "preparing")) ||
      orderStatus === "delivered";

    const icons = {
      pending: "time-outline",
      preparing: "construct-outline",
      delivered: "checkmark-done-outline",
    };

    return (
      <View style={styles.statusStep}>
        <Ionicons
          name={icons[step]}
          size={30}
          color={active ? "#00E5FF" : "#555"}
        />
        <Text style={{ color: active ? "#00E5FF" : "#555", marginTop: 5 }}>
          {step === "pending"
            ? "يتم التجهيز"
            : step === "preparing"
            ? "تم التجهيز"
            : "تم التوصيل"}
        </Text>
      </View>
    );
  };

  // ================= QUANTITY HANDLERS =================
  const handleIncrease = (item) => {
    const availableQty = item.quantityAvailable ?? 0; // ← استخدام الكمية المتوفرة من الباك اند
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

  if (isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color="#00E5FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!orderStatus && cartItems.length > 0 && !showEmptyMessage && (
        <>
          <Text style={styles.title}>🛒 السلة</Text>

          <FlatList
            data={itemsData}
            keyExtractor={(item) => item.uniqueId}
            renderItem={({ item }) => (
              <View style={styles.card}>
                {/* صورة المنتج */}
                <Image
                  source={{
                    uri: item.image.startsWith("http")
                      ? item.image
                      : `${BASE_URL}${item.image}`,
                  }}
                  style={styles.image}
                />

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.text}>{item.title}</Text>
                  <Text style={styles.text}>
                    {item.price * item.quantity} د.ع
                  </Text>

                  {/* أزرار + و - */}
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

                  {/* رسالة خطأ الكمية */}
                  {quantityError[item.uniqueId] && (
                    <Text style={{ color: "red", marginTop: 2 }}>
                      {quantityError[item.uniqueId]}
                    </Text>
                  )}
                </View>

                {/* زر حذف */}
                <Pressable onPress={() => removeFromCart(item.uniqueId)}>
                  <Ionicons name="trash" size={22} color="red" />
                </Pressable>
              </View>
            )}
          />

          <Pressable style={styles.orderBtn} onPress={handleOrder}>
            <Text style={styles.orderBtnText}>اطلب</Text>
          </Pressable>
        </>
      )}

      {orderStatus && location && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: clientLat,
              longitude: clientLng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker coordinate={{ latitude: clientLat, longitude: clientLng }} />

            {delverData && (
              <Marker.Animated
                ref={markerRef}
                coordinate={delverRegion}
                title={`🚚 ${delverData.name}`}
              >
                <Image
                  source={require("../../assets/images/d.jpg")}
                  style={{ width: 50, height: 50 }}
                  resizeMode="contain"
                />
              </Marker.Animated>
            )}
          </MapView>

          <View style={styles.statusContainer}>
            <StatusIcon step="pending" />
            <StatusIcon step="preparing" />
            <StatusIcon step="delivered" />
          </View>

          {delverData && (
            <View style={styles.delverInfo}>
              <Text style={styles.delverText}>
                🚚 المندوب: {delverData.name}
              </Text>

              <Pressable
                onPress={() =>
                  delverData.phone &&
                  Linking.openURL(`tel:${delverData.phone}`)
                }
              >
                <Text style={styles.delverPhone}>
                  📞 {delverData.phone || "غير متوفر"}
                </Text>
              </Pressable>

              {orderedItems.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  {orderedItems.map((item) => (
                    <Text
                      key={item.uniqueId}
                      style={{ color: "#fff", fontSize: 14, marginTop: 2 }}
                    >
                      {item.title} × {item.quantity} ={" "}
                      {item.price * item.quantity} د.ع
                    </Text>
                  ))}

                  <Text style={{ color: "#00E5FF", fontSize: 16, marginTop: 5 }}>
                    المجموع: {orderedTotal} د.ع
                  </Text>
                </View>
              )}
            </View>
          )}

          {showOk && (
            <Pressable
              style={styles.okBtn}
              onPress={() => {
                clearCart();
                setOrderStatus(null);
                setDelverData(null);
                setShowOk(false);
                setShowEmptyMessage(true);
              }}
            >
              <Text style={styles.okText}>OK</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1e1b4b", padding: 20 },
  title: { color: "#00E5FF", fontSize: 22, fontWeight: "bold" },
  card: { flexDirection: "row", marginBottom: 10, alignItems: "center" },
  image: { width: 50, height: 50, borderRadius: 10 },
  text: { color: "#fff" },
  orderBtn: {
    backgroundColor: "#00E5FF",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  orderBtnText: { color: "#fff", fontWeight: "bold" },
  mapContainer: { marginTop: 20 },
  map: { height: 300 },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
  },
  statusStep: { alignItems: "center" },
  okBtn: {
    marginTop: 20,
    backgroundColor: "#00E5FF",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  okText: { color: "#fff", fontWeight: "bold" },
  delverInfo: {
    marginTop: 15,
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  delverText: { color: "#00E5FF", fontSize: 16, fontWeight: "bold" },
  delverPhone: { color: "#fff", fontSize: 15, marginTop: 5 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
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
