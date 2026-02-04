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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCart } from "../context/CartContext";

// ⚡BASE_URL لا حاجة لإضافته قبل صور ImageBB، فقط للـ API
const BASE_URL = "https://back-end-nodejs-production-d9de.up.railway.app";

export default function CategoryDetails() {
  const { addToCart, cartItems, updateQuantity } = useCart();
  const router = useRouter();
  const { category, title } = useLocalSearchParams();

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

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

      {cartItems.length > 0 && (
        <Pressable
          onPress={() => router.push("/Cared")}
          style={styles.cartSummary}
        >
          <Text style={styles.cartText}>
            المنتجات: {cartItems.length}
          </Text>

          <Text style={styles.cartText}>
            المجموع:{" "}
            {cartItems.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0
            )}{" "}
            IQD
          </Text>
        </Pressable>
      )}
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
  cartSummary: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    backgroundColor: "#0f172a",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
