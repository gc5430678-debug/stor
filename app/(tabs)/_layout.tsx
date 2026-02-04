import { Stack, Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Text } from 'react-native';
import { useCart } from '../../context/CartContext'; // ✅ مهم

export default function TabLayout() {
  const { cartItems } = useCart(); // 🛒
  const cartCount = cartItems.length;

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: styles.scene,
        tabBarStyle: {
          backgroundColor: '#1e1b4b',
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: 'transparent',
        },
        tabBarActiveTintColor: '#00E5FF',
        tabBarInactiveTintColor: '#9ca3af',
      }}
    >
      {/* الرئيسية */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size ?? 28} color={color} />
          ),
        }}
      />

      {/* السلة */}
      <Tabs.Screen
        name="Cared"
        options={{
          title: 'السلة',
          tabBarIcon: ({ color, size }) => (
            <View style={{ position: 'relative' }}>
              <Ionicons
                name="cart-outline"
                size={size ?? 28}
                color={color}
              />

              {/* 🔴 العداد */}
              {cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {cartCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      {/* الملف الشخصي */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'الملف الشخصي',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size ?? 28} color={color} />
          ),
        }}
      />
    </Tabs>
    </>
  );
}
const styles = StyleSheet.create({
  scene: {
    backgroundColor: '#1e1b4b',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#ff3b30', // أحمر
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
