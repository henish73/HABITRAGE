import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet, useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useSession, useSyncStatus, tokens } from "../src/lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Shown whenever screens are displaying the last saved copy instead of live data. */
function OfflineBanner() {
  const { source, syncedAt } = useSyncStatus();
  const token = useSession((s) => s.token);
  if (!token || source !== "cache") return null;
  const when = syncedAt
    ? new Date(syncedAt).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "earlier";
  return (
    <View style={[styles.banner, { backgroundColor: tokens.colors.light.warnSoft }]}>
      <Text style={[styles.bannerText, { color: tokens.colors.light.warn }]}>Offline · showing data from {when}</Text>
    </View>
  );
}

export default function RootLayout() {
  const { ready, load } = useSession();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    async function registerForPushNotificationsAsync() {
      if (Platform.OS !== "web") {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        if (existingStatus !== "granted") {
          await Notifications.requestPermissionsAsync();
        }
      }
    }
    registerForPushNotificationsAsync();
  }, []);

  if (!ready) {
    return (
      <View style={[styles.splash, { backgroundColor: tokens.colors[scheme].vault }]}>
        <ActivityIndicator color={tokens.colors[scheme].teal} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: "center", justifyContent: "center" },
  banner: { paddingTop: 48, paddingBottom: 8, paddingHorizontal: 16 },
  bannerText: { fontSize: 12, fontWeight: "600", textAlign: "center" },
});
