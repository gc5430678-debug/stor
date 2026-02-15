import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";

const COLORS = {
  bg: "#0f0f2",
  card: "#1a1a2e",
  accent: "#00E5FF",
  accentDim: "rgba(0, 229, 255, 0.15)",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  danger: "#ef4444",
  dangerDim: "rgba(239, 68, 68, 0.15)",
};

const API = "https://back-end-nodejs-production-fdc5.up.railway.app/api";

export default function ExploreScreen() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [mapVisible, setMapVisible] = useState(false);
  const [tempRegion, setTempRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta?: number;
    longitudeDelta?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [tempPhone, setTempPhone] = useState("");
  const [welcomeVisible, setWelcomeVisible] = useState(false);

  const getCurrentLocation = async () => {
    setLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLoading(false);
      Alert.alert("❌", "تم رفض إذن الموقع");
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setTempRegion(newRegion);
      setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    } catch {
      Alert.alert(
        "الموقع غير متوفر",
        "تأكد من تفعيل خدمات الموقع (GPS) في إعدادات الجهاز ثم أعد المحاولة."
      );
    } finally {
      setLoading(false);
    }
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
    const res = await fetch(`${API}/auth/register`, {
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
    const res = await fetch(`${API}/auth/verify`, {
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
      const res = await fetch(`${API}/user/save-info`, {
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
      await fetch(`${API}/auth/logout`, {
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

  // ——— شاشة الترحيب ———
  if (welcomeVisible) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.welcomeScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeIconWrap}>
              <Ionicons name="heart" size={48} color={COLORS.accent} />
            </View>
            <Text style={styles.welcomeTitle}>أهلاً وسهلاً فيك!</Text>
            <Text style={styles.welcomeSub}>يمكنك التسوق الآن، اذهب لتسوق واستمتع بتجربة سهلة.</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
            onPress={() => {
              setWelcomeVisible(false);
              setStep(3);
            }}
          >
            <Ionicons name="create-outline" size={22} color="#0f0f23" />
            <Text style={styles.primaryBtnText}>تعديل المعلومات</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.btnPressed]}
            onPress={logout}
          >
            <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
            <Text style={styles.logoutBtnText}>تسجيل خروج</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ——— المحتوى الرئيسي ———
  return (
    <>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.lottieWrap}>
            <LottieView
              source={{ uri: "https://lottie.host/03ed0753-b5f9-4d77-96f5-4d0474106c16/5juixtLQGG.lottie" }}
              autoPlay
              loop
              style={styles.lottie}
            />
          </View>

          {step === 1 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>تسجيل حساب جديد</Text>
              <Text style={styles.label}>الاسم</Text>
              <TextInput
                placeholder="أدخل اسمك"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
                style={styles.input}
              />
              <Text style={styles.label}>البريد الإلكتروني</Text>
              <TextInput
                placeholder="example@email.com"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
                onPress={register}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0f0f23" />
                ) : (
                  <>
                    <Ionicons name="mail-outline" size={22} color="#0f0f23" />
                    <Text style={styles.primaryBtnText}>إرسال رمز التحقق</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {step === 2 && (
            <View style={styles.card}>
              <View style={styles.verifyIconWrap}>
                <Ionicons name="shield-checkmark" size={40} color={COLORS.accent} />
              </View>
              <Text style={styles.cardTitle}>تحقق من بريدك</Text>
              <Text style={styles.cardSub}>أدخل الرمز المرسل إلى إيميلك</Text>
              <TextInput
                placeholder="رمز التحقق (PIN)"
                placeholderTextColor={COLORS.textMuted}
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                style={styles.pinInput}
                maxLength={6}
              />
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
                onPress={verify}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0f0f23" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={22} color="#0f0f23" />
                    <Text style={styles.primaryBtnText}>تحقق</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {step === 3 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>معلوماتك</Text>
              <Text style={styles.cardSub}>رقم الهاتف والموقع لتوصيل الطلبات</Text>

              <Text style={styles.label}>رقم الهاتف</Text>
              <Pressable
                style={styles.inputWrap}
                onPress={() => {
                  setTempPhone(phone);
                  setPhoneModalVisible(true);
                }}
              >
                <Ionicons name="call-outline" size={22} color={COLORS.textMuted} />
                <Text style={[styles.inputText, !phone && { color: COLORS.textMuted }]}>
                  {phone || "اضغط لإضافة رقم الهاتف"}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </Pressable>

              <Text style={styles.label}>موقع التوصيل</Text>
              <Pressable
                style={styles.inputWrap}
                onPress={async () => {
                  await getCurrentLocation();
                  setMapVisible(true);
                }}
              >
                <Ionicons name="location-outline" size={22} color={COLORS.textMuted} />
                <Text style={[styles.inputText, !location && { color: COLORS.textMuted }]} numberOfLines={1}>
                  {location || "اضغط لاختيار موقعك على الخريطة"}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
                onPress={saveInfo}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0f0f23" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={22} color="#0f0f23" />
                    <Text style={styles.primaryBtnText}>حفظ</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.logoutBtn, pressed && styles.btnPressed]}
                onPress={logout}
              >
                <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
                <Text style={styles.logoutBtnText}>تسجيل خروج</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* مودال رقم الهاتف */}
      <Modal visible={phoneModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setPhoneModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>رقم الهاتف</Text>
            <TextInput
              style={styles.input}
              value={tempPhone}
              onChangeText={(text) => setTempPhone(text.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              maxLength={11}
              placeholder="07xxxxxxxx"
              placeholderTextColor={COLORS.textMuted}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, styles.modalBtn, pressed && styles.btnPressed]}
                onPress={() => {
                  setPhone(tempPhone);
                  setPhoneModalVisible(false);
                }}
              >
                <Text style={styles.primaryBtnText}>حفظ</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
                onPress={() => setPhoneModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* مودال الخريطة */}
      <Modal visible={mapVisible} animationType="slide">
        <View style={styles.mapContainer}>
          <WebView
            originWhitelist={["*"]}
            source={{
              html: `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style> html, body, #map { height: 100%; margin: 0; padding: 0; } </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var lat = ${tempRegion?.latitude ?? 33.3152};
    var lng = ${tempRegion?.longitude ?? 44.3661};
    var map = L.map('map').setView([lat, lng], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    var marker = L.marker([lat, lng]).addTo(map);
    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      window.ReactNativeWebView.postMessage(JSON.stringify(e.latlng));
    });
  </script>
</body>
</html>`,
            }}
            onMessage={(event) => {
              const { lat, lng } = JSON.parse(event.nativeEvent.data);
              setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            }}
          />
          <Pressable
            style={({ pressed }) => [styles.mapConfirmBtn, pressed && styles.btnPressed]}
            onPress={() => setMapVisible(false)}
          >
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.mapConfirmText}>تأكيد الموقع</Text>
          </Pressable>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>جارٍ التحميل...</Text>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: 24, paddingTop: 50, paddingBottom: 40 },
  welcomeScroll: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  lottieWrap: {
    alignItems: "center",
    marginBottom: 24,
  },
  lottie: { width: 160, height: 160 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.12)",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  cardSub: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 24,
  },
  verifyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accentDim,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    paddingHorizontal: 18,
    height: 54,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.2)",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    paddingHorizontal: 18,
    height: 54,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.2)",
    gap: 12,
  },
  inputText: { flex: 1, color: COLORS.text, fontSize: 16 },
  pinInput: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 18,
    marginVertical: 16,
    color: COLORS.text,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.2)",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 24,
    gap: 10,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: { color: "#0f0f23", fontSize: 17, fontWeight: "800" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.dangerDim,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  logoutBtnText: { color: COLORS.danger, fontSize: 16, fontWeight: "700" },
  btnPressed: { opacity: 0.9 },
  welcomeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 32,
    marginBottom: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.12)",
  },
  welcomeIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.accentDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
    textAlign: "center",
  },
  welcomeSub: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.15)",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 16,
  },
  modalActions: { marginTop: 20, gap: 12 },
  modalBtn: { marginTop: 0 },
  cancelBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  cancelBtnText: { color: COLORS.textMuted, fontSize: 16, fontWeight: "600" },
  mapContainer: { flex: 1 },
  mapConfirmBtn: {
    position: "absolute",
    bottom: 40,
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  mapConfirmText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingCard: {
    backgroundColor: COLORS.card,
    padding: 32,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.2)",
  },
  loadingText: { color: COLORS.text, marginTop: 16, fontSize: 16, fontWeight: "600" },
});
