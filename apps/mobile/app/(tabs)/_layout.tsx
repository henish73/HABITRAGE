import React from "react";
import { Tabs, Redirect } from "expo-router";
import { useColorScheme } from "react-native";
import { useSession, tokens } from "../../src/lib/api";
import { Home, ArrowLeftRight, CalendarDays, CreditCard, SlidersHorizontal } from "lucide-react-native";

export default function TabLayout() {
  const token = useSession((s) => s.token);
  const c = tokens.colors[useColorScheme() === "dark" ? "dark" : "light"];

  // Every tab needs a session; without one, go to the passcode screen.
  if (!token) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: c.faint,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.line,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: c.surface,
          borderBottomColor: c.line,
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTitleStyle: {
          fontSize: 16,
          fontWeight: "700",
          color: c.ink,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => <ArrowLeftRight color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="bills"
        options={{
          title: "Plan",
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: "Wallet",
          tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <SlidersHorizontal color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
