import React, { createContext, useContext, useState } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  // إضافة عنصر للسلة
  const addToCart = (item) => {
    const newItem = { ...item, uniqueId: Date.now(), quantity: 1 }; // معرف فريد لكل عنصر
    setCartItems((prev) => [...prev, newItem]);
  };

  // إزالة عنصر حسب uniqueId
  const removeFromCart = (uniqueId) => {
    setCartItems((prev) => prev.filter((item) => item.uniqueId !== uniqueId));
  };

  // تعديل كمية عنصر محدد
  const updateQuantity = (uniqueId, quantity) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.uniqueId === uniqueId
          ? { ...item, quantity: Math.max(quantity, 1) }
          : item
      )
    );
  };

  // تفريغ السلة بالكامل
  const clearCart = () => {
    setCartItems([]);
  };

  // حساب السعر الكلي
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart, // ← تمت الإضافة هنا
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
