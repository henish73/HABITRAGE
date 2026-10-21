import React from "react";
import { Tabs } from "expo-router";
import { Home, Landmark, ArrowLeftRight, CalendarCheck, MoreHorizontal } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#0F172A",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#F1F5F9",
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: "#FFFFFF",
          borderBottomColor: "#F1F5F9",
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTitleStyle: {
          fontSize: 16,
          fontWeight: "bold",
          color: "#0F172A",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: "Accounts",
          tabBarIcon: ({ color, size }) => <Landmark color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ color, size }) => <ArrowLeftRight color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="bills"
        options={{
          title: "Bills",
          tabBarIcon: ({ color, size }) => <CalendarCheck color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => <MoreHorizontal color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
