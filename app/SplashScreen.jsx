import React, { useEffect } from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import LottieView from "lottie-react-native";
import { useRouter } from "expo-router";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(tabs)"); // انتقل بعدها إلى صفحة تسجيل الدخول
    }, 3000); // مدة العرض: 3 ثواني

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <LottieView
        source={{
          uri:
            "https://lottie.host/03ed0753-b5f9-4d77-96f5-4d0474106c16/5juixtLQGG.lottie",
        }}
        autoPlay
        loop={false}
        style={styles.animation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e1b4b",
    justifyContent: "center",
    alignItems: "center",
  },
  animation: {
    width: 300,
    height: 300,
  },
});
