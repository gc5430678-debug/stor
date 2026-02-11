import React, { useEffect, useState, useRef } from "react";

import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TextInput,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const BASE_URL = "https://back-end-nodejs-production-fdc5.up.railway.app";

export default function CategoriesScreen() {
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const flatListRef = useRef(null);
  const currentIndex = useRef(0);
  const router = useRouter();

  // 🔹 جلب البيانات
  useEffect(() => {
    fetchImages();
    fetchCategories();
  }, []);

  const fetchImages = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/home`);
      setImages(res.data || []);
    } catch (error) {
      console.log("HOME API ERROR:", error.message);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/product`);
      setCategories(res.data || []);
      setFilteredCategories(res.data || []);
    } catch (error) {
      console.log("CATEGORY API ERROR:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 دالة تحويل الاسم العربي → انجليزي
  const generateCategoryEn = (title) => {
    switch (title) {
      case "الحوم":
        return "meat";
      case "افخاذ دجاج":
        return "chicken";
      case "مشروبات غازيه":
        return "drinks";
      case "عروض خاصه":
        return "Offers";
      case "المياه":
        return "waters";
      default:
        return title.toLowerCase().replace(/\s+/g, "-");
    }
  };

  // 🔹 البحث في الأقسام فقط
  useEffect(() => {
    if (!search) {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredCategories(filtered);
    }
  }, [search, categories]);

  // 🔹 سلايدر تلقائي
  useEffect(() => {
    if (images.length === 0) return;
    const interval = setInterval(() => {
      currentIndex.current =
        currentIndex.current === images.length - 1
          ? 0
          : currentIndex.current + 1;

      flatListRef.current?.scrollToIndex({
        index: currentIndex.current,
        animated: true,
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [images]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#00E5FF" />
      </View>
    );
  }

  return (
    <>
      {/* ===== شريط البحث ===== */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#ccc" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن القسم ..."
          placeholderTextColor="#ccc"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={{ flex: 0 }}>
        {/* ===== سلايدر Home ===== */}
        {images.length > 0 && (
          <FlatList
            ref={flatListRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => item._id || index.toString()}
            renderItem={({ item }) => (
              <View style={styles.slide}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.sliderImage}
                />
              </View>
            )}
            onScrollToIndexFailed={() => {}}
          />
        )}

        {/* ===== عنوان الأقسام مع بوردر ===== */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>الأقسام</Text>
          <View style={styles.headerBorder} />
        </View>

        {/* ===== قائمة الأقسام ===== */}
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => item._id}
          numColumns={5}
          contentContainerStyle={{ padding: 10 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/CategoryDetails",
                  params: {
                    category: generateCategoryEn(item.title),
                    title: item.title,
                  },
                })
              }
            >
              <Image
                source={{ uri: item.image }}
                style={styles.image}
              />
              <Text style={styles.title}>{item.title}</Text>
            </Pressable>
          )}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  sliderImage: {
    width: width - 40,
    height: 180,
    borderRadius: 16,
    marginHorizontal: 40,
    marginVertical: 10,
  },
  slide: { width, alignItems: "center" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    marginHorizontal: 20,
    marginVertical: 30,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: { flex: 1, color: "#fff", height: "100%" },
  card: {
    flex: 1,
    margin: 1,
    borderRadius: 10,
    backgroundColor: "#1e1b4b",
    alignItems: "center",
    padding: 4,
  },
  image: {
    width: "104%",
    height: 80,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#00E5FF",
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "bold", textAlign: "center" },
  headerContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  headerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "right",
  },
  headerBorder: {
    height: 2,
    backgroundColor: "#fff",
    marginTop: 5,
    width: "20%",
    alignSelf: "flex-end",
  },
});
