// app/CategoryDetails.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCart } from "../context/CartContext";

// ⚡BASE_URL لا حاجة لإضافته قبل صور ImageBB، فقط للـ API
const BASE_URL = "https://back-end-nodejs-production-fdc5.up.railway.app";

export default function CategoryDetails() {
  const { addToCart, cartItems, updateQuantity, totalPrice } = useCart();
  const router = useRouter();
  const { category, title } = useLocalSearchParams();

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFloatingCart, setShowFloatingCart] = useState(false);

  useEffect(() => {
    getProducts();
  }, [category]);

  const getProducts = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/all?category=${category}`);
      const data = await res.json();

      const mapped = data.map((item) => ({
        ...item,
        title: item.title || "",
      }));

      setProducts(mapped);
      setFilteredProducts(mapped);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearch(text);
    if (!text) {
      setFilteredProducts(products);
      return;
    }
    const filtered = products.filter((item) =>
      item.title.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredProducts(filtered);
  };

  const renderItem = ({ item }) => {
    const cartItem = cartItems.find((c) => c._id === item._id);
    const availableQty = item.quantityAvailable ?? 0;

    return (
      <View style={styles.card}>
        {/* ⚡ استخدام item.image مباشرة بدون BASE_URL */}
        <Image
          source={{ uri: item.image }}
          style={styles.image}
        />
        <Text style={styles.name}>{item.title}</Text>
        <Text style={styles.price}>{item.price} IQD</Text>

        {availableQty === 0 && (
          <Text style={{ color: "#ff4d4d", marginBottom: 5 }}>
            ❌ الكمية غير متوفرة
          </Text>
        )}

        {cartItem ? (
          <View style={styles.quantityContainer}>
            <Pressable
              style={styles.quantityBtn}
              onPress={() =>
                updateQuantity(cartItem.uniqueId, cartItem.quantity - 1)
              }
            >
              <Ionicons name="remove" size={18} color="#fff" />
            </Pressable>

            <Text style={styles.quantityText}>{cartItem.quantity}</Text>

            <Pressable
              style={[
                styles.quantityBtn,
                cartItem.quantity >= availableQty && { opacity: 0.4 },
              ]}
              onPress={() => {
                if (cartItem.quantity >= availableQty) {
                  Alert.alert("⚠️ تنبيه", "الكمية غير كافية");
                  return;
                }
                updateQuantity(cartItem.uniqueId, cartItem.quantity + 1);
              }}
            >
              <Ionicons name="add" size={18} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.cartBtn, availableQty === 0 && { opacity: 0.4 }]}
            disabled={availableQty === 0}
            onPress={() => {
              if (availableQty === 0) {
                Alert.alert("❌ غير متوفر", "الكمية غير متوفرة");
                return;
              }
              addToCart(item);
              setShowFloatingCart(true);
            }}
          >
            <Text style={styles.cartText}>إضافة للسلة</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>⬅ رجوع</Text>
      </Pressable>

      <Text style={styles.title}>{title}</Text>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#ccc" />
        <TextInput
          placeholder="بحث عن منتج..."
          placeholderTextColor="#ccc"
          value={search}
          onChangeText={handleSearch}
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00E5FF" />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* شريط صغير لفتح السلة العائمة */}
      {cartItems.length > 0 && !showFloatingCart && (
        <Pressable
          onPress={() => setShowFloatingCart(true)}
          style={styles.floatingTrigger}
        >
          <Ionicons name="cart" size={22} color="#00E5FF" />
          <Text style={styles.floatingTriggerText}>
            المنتجات: {cartItems.length} | المجموع: {(totalPrice ?? 0).toLocaleString()} د.ع
          </Text>
          <Ionicons name="chevron-up" size={20} color="#00E5FF" />
        </Pressable>
      )}

      {/* لوحة السلة العائمة - لا تختفي إلا بزر خروج */}
      <Modal
        visible={showFloatingCart && cartItems.length > 0}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFloatingCart(false)}
      >
        <View style={styles.floatingOverlay}>
          <View style={styles.floatingPanel}>
            <View style={styles.floatingPanelHandle} />
            <View style={styles.floatingPanelHeader}>
              <View style={styles.floatingPanelHeaderLeft}>
                <View style={styles.floatingPanelHeaderIcon}>
                  <Ionicons name="cart" size={22} color="#00E5FF" />
                </View>
                <Text style={styles.floatingPanelTitle}>منتجات السلة</Text>
                <View style={styles.floatingPanelBadge}>
                  <Text style={styles.floatingPanelBadgeText}>{cartItems.length}</Text>
                </View>
              </View>
              <Pressable
                style={styles.floatingCloseBtn}
                onPress={() => setShowFloatingCart(false)}
              >
                <Ionicons name="close-circle" size={36} color="#00E5FF" />
                <Text style={styles.floatingCloseBtnText}>خروج</Text>
              </Pressable>
            </View>
            <View style={styles.floatingPanelScrollWrap}>
              <ScrollView
                style={styles.floatingPanelScroll}
                contentContainerStyle={styles.floatingPanelScrollContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                bounces={true}
              >
              {cartItems.map((item) => (
                <View key={item.uniqueId} style={styles.floatingProductCard}>
                  <Image
                    source={{ uri: item.image?.startsWith?.("http") ? item.image : `${BASE_URL}${item.image}` }}
                    style={styles.floatingProductImage}
                  />
                  <View style={styles.floatingProductInfo}>
                    <Text style={styles.floatingProductName} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.floatingProductMeta}>
                      {item.quantity} × {(item.price ?? 0).toLocaleString()} د.ع
                    </Text>
                    <Text style={styles.floatingProductTotal}>
                      {((item.price ?? 0) * item.quantity).toLocaleString()} د.ع
                    </Text>
                  </View>
                </View>
              ))}
              </ScrollView>
            </View>
            <View style={styles.floatingPanelTotalRow}>
              <Text style={styles.floatingPanelTotalLabel}>المجموع الكلي</Text>
              <Text style={styles.floatingPanelTotalValue}>
                {(totalPrice ?? 0).toLocaleString()} د.ع
              </Text>
            </View>
            <Pressable
              style={styles.floatingGoToCartBtn}
              onPress={() => {
                setShowFloatingCart(false);
                router.push("/Cared");
              }}
            >
              <Text style={styles.floatingGoToCartBtnText}>الذهاب إلى السلة</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e1b4b",
    paddingTop: 50,
    paddingHorizontal: 10,
  },
  backBtn: { marginBottom: 10 },
  backText: { color: "#00E5FF", fontSize: 18, fontWeight: "bold" },
  title: {
    color: "#fff",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "bold",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 15,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  searchInput: { flex: 1, height: 40, color: "#fff" },
  card: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 15,
    padding: 10,
    margin: 6,
    width: "47%",
    alignItems: "center",
  },
  image: { width: "100%", height: 110, borderRadius: 10 },
  name: { color: "#fff", marginTop: 5, fontWeight: "bold" },
  price: { color: "#00E5FF", marginVertical: 5 },
  cartBtn: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  cartText: { color: "#00E5FF", fontSize: 13, fontWeight: "bold" },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  quantityBtn: {
    backgroundColor: "#00E5FF",
    padding: 5,
    borderRadius: 5,
  },
  quantityText: {
    color: "#fff",
    fontSize: 16,
    marginHorizontal: 10,
  },
  floatingTrigger: {
    position: "absolute",
    bottom: 74,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.98)",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    gap: 10,
  },
  floatingTriggerText: {
    color: "#00E5FF",
    fontSize: 15,
    fontWeight: "700",
  },
  floatingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  floatingPanel: {
    backgroundColor: "#1e293b",
    marginBottom: 50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxHeight: "78%",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 24,
    overflow: "hidden",
  },
  floatingPanelScrollWrap: {
    height: 280,
    marginBottom: 8,
  },
  floatingPanelHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  floatingPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 229, 255, 0.2)",
  },
  floatingPanelHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  floatingPanelHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0, 229, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  floatingPanelTitle:{
    color: "#00E5FF",
    fontSize: 18,
    fontWeight: "800",
  },
  floatingPanelBadge: {
    backgroundColor: "#00E5FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  floatingPanelBadgeText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "800",
  },
  floatingCloseBtn: {
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  floatingCloseBtnText: {
    color: "#00E5FF",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  floatingPanelScroll: {
    flex: 1,
  },
  floatingPanelScrollContent: {
    paddingBottom: 24,
  },
  floatingProductCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  floatingProductImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#1e293b",
  },
  floatingProductInfo: {
    flex: 1,
    marginLeft: 12,
  },
  floatingProductName: {
    color: "#f1f5f9",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  floatingProductMeta: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 2,
  },
  floatingProductTotal: {
    color: "#00E5FF",
    fontSize: 15,
    fontWeight: "800",
  },
  floatingPanelTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 229, 255, 0.25)",
  },
  floatingPanelTotalLabel: {
    color: "#cbd5e1",
    fontSize: 17,
    fontWeight: "700",
  },
  floatingPanelTotalValue: {
    color: "#00E5FF",
    fontSize: 20,
    fontWeight: "800",
  },
  floatingGoToCartBtn: {
    marginTop: 12,
    backgroundColor: "rgba(0, 229, 255, 0.2)",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.4)",
  },
  floatingGoToCartBtnText: {
    color: "#00E5FF",
    fontSize: 16,
    fontWeight: "700",
  },
});
