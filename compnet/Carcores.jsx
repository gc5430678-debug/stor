// app/Categories.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import axios from "axios";
import { useRouter } from "expo-router";

const BASE_URL = "https://back-end-nodejs-production-d9de.up.railway.app";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/product`); // جلب الأقسام
      // تعديل المصفوفة لإضافة categoryEn لكل قسم (الاسم الإنجليزي)
      const mapped = res.data.map((item) => ({
        ...item,
        categoryEn: generateCategoryEn(item.title), // الدالة لتحويل العربي → إنجليزي
      }));
      setCategories(mapped);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  // دالة تحويل الاسم العربي → انجليزي (يمكن تعديلها حسب قاعدة بياناتك)
  const generateCategoryEn = (title) => {
    switch (title) {
      case "الحوم":
        return "meat";
      
      case "افخاذ دجاج":
        return "chicken";
      
      case "مشروبات غازيه":
        return "drinks";
      
      
        case " عروض خاصه":
        return "Offers";
      
        case "المياه":
      return "waters";
      default:
        return title.toLowerCase().replace(/\s+/g, "-"); // fallback
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#00E5FF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.header}>الأقسام</Text>

      <FlatList
        data={categories}
        keyExtractor={(item) => item._id}
        numColumns={4}
        contentContainerStyle={{ padding: 10 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/CategoryDetails", // صفحة المنتجات
                params: {
                  category: item.categoryEn, // الاسم الإنجليزي للـAPI
                  title: item.title,          // الاسم العربي للعرض
                },
              })
            }
          >
            <Image
              source={{ uri: `${BASE_URL}${item.image}` }}
              style={styles.image}
            />
            <Text style={styles.title}>{item.title}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    textAlign: "right",
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginRight: 20,
    marginTop: 24,
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#fff",
    paddingBottom: 5,
    alignSelf: "flex-end",
  },
  card: {
    flex: 1,
    margin: 5,
    borderRadius: 10,
    backgroundColor: "#1e1b4b",
    alignItems: "center",
    padding: 7,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#00E5FF",
  },
  title: { textAlign: "center", color: "#fff", fontSize: 16, fontWeight: "bold" },
});
