import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert } from "react-native";
import { ShieldCheck, Sparkles, BarChart2, Sliders, ArrowRight, Download, RefreshCw } from "lucide-react-native";

export default function MobileMore() {
  const handleFeatureNotice = (feature: string) => {
    Alert.alert(
      feature,
      "This module communicates in real-time with your FinanceOS Next.js & Supabase Postgres backend.",
      [{ text: "OK" }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>F</Text>
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.profileTitle}>FinanceOS Personal</Text>
            <Text style={styles.profileSub}>CIBC • TD • RBC • AMEX • Rogers</Text>
          </View>
        </View>

        {/* Feature List */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleFeatureNotice("Credit Report Vault")}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#ECFDF5" }]}>
              <ShieldCheck size={20} color="#10B981" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Credit Report Vault</Text>
              <Text style={styles.menuSubtitle}>Equifax 745 • 18.5% Utilization</Text>
            </View>
            <ArrowRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleFeatureNotice("AI Financial Assistant")}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#FEF3C7" }]}>
              <Sparkles size={20} color="#D97706" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>AI Copilot Assistant</Text>
              <Text style={styles.menuSubtitle}>Autonomous CRUD & Ledger Search</Text>
            </View>
            <ArrowRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleFeatureNotice("Deep Analytics")}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#F0F9FF" }]}>
              <BarChart2 size={20} color="#0284C7" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Financial Analytics</Text>
              <Text style={styles.menuSubtitle}>Spending trends & top merchants</Text>
            </View>
            <ArrowRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleFeatureNotice("System Settings")}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#F8FAFC" }]}>
              <Sliders size={20} color="#475569" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Settings & Privacy</Text>
              <Text style={styles.menuSubtitle}>Masking, currency CAD, export</Text>
            </View>
            <ArrowRight size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Data Sync & Footer */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Unified Codebase & Free Tier</Text>
          <Text style={styles.infoDesc}>
            Built on Turborepo, Next.js 15, and Expo. Synced with Supabase Free Postgres tier (500MB). 4,158 real reconciled transactions.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  profileMeta: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  profileSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  menuSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuTextCol: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  menuSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: "#F1F5F9",
    padding: 16,
    borderRadius: 16,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
  },
});
