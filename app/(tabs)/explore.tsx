import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, Modal } from "react-native"; // 🔹 LOADING
import LottieView from "lottie-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";

export default function App() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  const [mapVisible, setMapVisible] = useState(false);
  const [region, setRegion] = useState(null);
  const [tempRegion, setTempRegion] = useState(null); // ✅ مؤقت لتجنب crash

  const [loading, setLoading] = useState(false); // 🔹 LOADING

  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [tempPhone, setTempPhone] = useState("");

  const [welcomeVisible, setWelcomeVisible] = useState(false);

  const getCurrentLocation = async () => {
    setLoading(true); // 🔹 LOADING
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLoading(false);
      Alert.alert("❌", "تم رفض إذن الموقع");
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;

    const newRegion = {
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    setRegion(newRegion);
    setTempRegion(newRegion); // ✅ مؤقت
    setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    setLoading(false); // 🔹 LOADING
  };

  useEffect(() => {
    const checkLogin = async () => {
      const savedEmail = await AsyncStorage.getItem("email");
      const savedPhone = await AsyncStorage.getItem("phone");
      const savedLocation = await AsyncStorage.getItem("location");

      if (savedEmail && savedPhone && savedLocation) {
        setEmail(savedEmail);
        setPhone(savedPhone);
        setLocation(savedLocation);
        setWelcomeVisible(true);
      } else if (savedEmail) {
        setEmail(savedEmail);
        setStep(3);
      }
    };
    checkLogin();
  }, []);

  const register = async () => {
    setLoading(true);
    const res = await fetch("https://back-end-nodejs-production-d9de.up.railway.app/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    const data = await res.json();
    setLoading(false);
    Alert.alert(data.success ? "✅" : "❌", data.message);
    if (data.success) setStep(2);
  };

  const verify = async () => {
    setLoading(true);
    const res = await fetch("https://back-end-nodejs-production-d9de.up.railway.app/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, pin }),
    });
    const data = await res.json();
    setLoading(false);
    Alert.alert(data.success ? "✅" : "❌", data.message);
    if (data.success) {
      await AsyncStorage.setItem("email", email);
      setStep(3);
    }
  };

  const saveInfo = async () => {
    try {
      setLoading(true);

      if (!phone) {
        setLoading(false);
        Alert.alert("❌", "الرجاء إضافة رقم هاتف صالح");
        return;
      }

      const res = await fetch("https://back-end-nodejs-production-d9de.up.railway.app/api/user/save-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, location }),
      });

      const data = await res.json();
      setLoading(false);
      Alert.alert(data.success ? "✅" : "❌", data.message);

      if (data.success) {
        await AsyncStorage.setItem("name", name);
        await AsyncStorage.setItem("phone", phone);
        await AsyncStorage.setItem("location", location);
        setWelcomeVisible(true);
      }
    } catch {
      setLoading(false);
      Alert.alert("❌", "فشل الاتصال بالسيرفر");
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await AsyncStorage.clear();

      await fetch("https://back-end-nodejs-production-d9de.up.railway.app/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      setStep(1);
      setWelcomeVisible(false);
      setName("");
      setEmail("");
      setPin("");
      setPhone("");
      setLocation("");
      setLoading(false);
    } catch {
      setLoading(false);
      Alert.alert("❌", "حدث خطأ أثناء تسجيل الخروج");
    }
  };

  if (welcomeVisible) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { marginBottom: 20 }]}>أهلاً وسهلاً فيك!</Text>
        <Text style={{ color: "#fff", textAlign: "center", marginBottom: 30 }}>
          يمكنك التسوق، اذهب لتسوق.
        </Text>
        <Pressable
          style={[styles.btn, { backgroundColor: "#00E5FF", marginBottom: 10 }]}
          onPress={() => {
            setWelcomeVisible(false);
            setStep(3);
          }}
        >
          <Text style={styles.btnText}>تعديل المعلومات</Text>
        </Pressable>
        <Pressable style={[styles.btn, { backgroundColor: "#ef4444" }]} onPress={logout}>
          <Text style={styles.btnText}>تسجيل خروج</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.lottieWrapper}>
          <LottieView
            source={{ uri: "https://lottie.host/03ed0753-b5f9-4d77-96f5-4d0474106c16/5juixtLQGG.lottie" }}
            autoPlay
            loop
            style={styles.lottie}
          />
        </View>

        {step === 1 && (
          <>
            <Text style={styles.title}>تسجيل</Text>
            <TextInput placeholder="الاسم" placeholderTextColor="#fff" style={styles.input} onChangeText={setName} />
            <TextInput placeholder="الإيميل" placeholderTextColor="#fff" style={styles.input} onChangeText={setEmail} />
            <Pressable style={styles.btn} onPress={register}>
              <Text style={styles.btnText}>إرسال PIN</Text>
            </Pressable>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.title}>تحقق</Text>
            <TextInput placeholder="PIN" placeholderTextColor="#fff" style={styles.input} onChangeText={setPin} keyboardType="number-pad" />
            <Pressable style={styles.btn} onPress={verify}>
              <Text style={styles.btnText}>تحقق</Text>
            </Pressable>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.title}>معلومات إضافية</Text>

            <Pressable onPress={() => { setTempPhone(phone); setPhoneModalVisible(true); }}>
              <View style={[styles.input, { justifyContent: "center" }]}>
                <Text style={{ color: "#fff", textAlign: "center" }}>{phone || "أضف رقم هاتف"}</Text>
              </View>
            </Pressable>

            <Pressable onPress={async () => { await getCurrentLocation(); setMapVisible(true); }}>
              <View pointerEvents="none">
                <TextInput placeholder="اختر موقعك من الخريطة" placeholderTextColor="#fff" style={styles.input} value={location} />
              </View>
            </Pressable>

            <Pressable style={styles.btn} onPress={saveInfo}>
              <Text style={styles.btnText}>حفظ</Text>
            </Pressable>

            <Pressable style={[styles.btn, { backgroundColor: "#ef4444", marginTop: 10 }]} onPress={logout}>
              <Text style={styles.btnText}>تسجيل خروج</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* 🔹 Modal لتغيير رقم الهاتف */}
      <Modal visible={phoneModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ backgroundColor: "#1e1b4b", padding: 20, borderRadius: 10, width: "100%" }}>
            <Text style={{ color: "#fff", marginBottom: 10 }}>أدخل رقم الهاتف</Text>
            <TextInput
              style={[styles.input, { marginBottom: 10 }]}
              value={tempPhone}
              onChangeText={text => setTempPhone(text.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              maxLength={11}
              placeholder="أدخل الرقم"
              placeholderTextColor="#fff"
            />
            <Pressable style={styles.btn} onPress={() => { setPhone(tempPhone); setPhoneModalVisible(false); }}>
              <Text style={styles.btnText}>حفظ</Text>
            </Pressable>
            <Pressable style={[styles.btn, { backgroundColor: "#ef4444", marginTop: 10 }]} onPress={() => setPhoneModalVisible(false)}>
              <Text style={styles.btnText}>إلغاء</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 🔹 Modal للخرائط باستخدام OSM بدون API */}
     {/* 🔹 Modal خريطة OSM آمنة 100% */}
<Modal visible={mapVisible} animationType="slide">
  <WebView
    originWhitelist={["*"]}
    source={{
      html: `
       
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      height: 100%;
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    var lat = ${tempRegion?.latitude || 33.3152};
    var lng = ${tempRegion?.longitude || 44.3661};

    var map = L.map('map').setView([lat, lng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    var marker = L.marker([lat, lng]).addTo(map);

    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      window.ReactNativeWebView.postMessage(
        JSON.stringify(e.latlng)
      );
    });
  </script>
</body>
</html>
`

      
    }}
    onMessage={(event) => {
      const { lat, lng } = JSON.parse(event.nativeEvent.data);
      setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }}
  />

  <Pressable
    style={{
      position: "absolute",
      bottom: 40,
      alignSelf: "center",
      backgroundColor: "#1e90ff",
      padding: 15,
      borderRadius: 10,
    }}
    onPress={() => setMapVisible(false)}
  >
    <Text style={{ color: "#fff", fontWeight: "bold" }}>
      تأكيد الموقع
    </Text>
  </Pressable>
</Modal>


      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#00E5FF" />
          <Text style={styles.loadingText}>جارٍ التحميل...</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#1e1b4b" },
  lottieWrapper: { alignItems: "center", marginBottom: 10 },
  lottie: { width: 180, height: 180 },
  title: { fontSize: 22, color: "#fff", marginBottom: 20, textAlign: "center" },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    textAlign: "center",
    color: "#fff",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#00E5FF",
  },
  btn: { backgroundColor: "#00E5FF", padding: 15, borderRadius: 8 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  loadingOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingText: { color: "#fff", marginTop: 10, fontSize: 16 },
});
