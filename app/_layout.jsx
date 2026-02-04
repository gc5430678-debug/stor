import { Slot } from "expo-router";
import { CartProvider } from "../context/CartContext";
import * as Linking from "expo-linking";
import { useEffect } from "react";
export default function RootLayout() {
   useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      if (!url) return;

      const token = url.split("token=")[1];
      console.log("JWT TOKEN:", token);

      // 🔐 هنا لاحقًا نخزّن التوكن
    });

    return () => sub.remove();
  }, []);
  return (
    <>
    <CartProvider>
      <Slot />
    </CartProvider>
    </>


  );

  
}
