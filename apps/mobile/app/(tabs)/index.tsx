import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from "react-native";
import { formatCAD } from "@financeos/shared";
import { fetchAccounts, fetchTransactions, MobileAccount, MobileTransaction } from "../../src/lib/api";
import { ArrowDownRight, ArrowUpRight, Shield, AlertTriangle, Eye, EyeOff } from "lucide-react-native";

export default function MobileDashboard() {
  const [accounts, setAccounts] = useState<MobileAccount[]>([]);
  const [transactions, setTransactions] = useState<MobileTransaction[]>([]);
  const [isMasked, setIsMasked] = useState(true);

  useEffect(() => {
    fetchAccounts().then((accs) => {
      if (accs && accs.length > 0) setAccounts(accs);
    });
    fetchTransactions().then((txs) => {
      if (txs && txs.length > 0) setTransactions(txs);
    });
  }, []);

  const bankTotal = accounts
    .filter((a) => a.type === "bank")
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const debtTotal = accounts
    .filter((a) => a.type === "credit_card")
    .reduce((sum, a) => sum + Math.max(0, a.balance || 0), 0);

  const netWorth = bankTotal - debtTotal;
  const cashRatio = debtTotal > 0 ? (bankTotal / (bankTotal + debtTotal)) * 100 : 100;

  const cards = accounts.filter((a) => a.type === "credit_card");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.greetingSub}>Good evening</Text>
            <Text style={styles.greetingTitle}>Your money</Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsMasked(!isMasked)}
            style={styles.maskBtn}
            accessibilityLabel="Toggle privacy mask"
          >
            {isMasked ? <EyeOff color="#5A6B80" size={18} /> : <Eye color="#5A6B80" size={18} />}
          </TouchableOpacity>
        </View>

        {/* Net Worth Card (Vault 2.0 Style) */}
        <View style={styles.netWorthCard}>
          <View style={styles.nwRow}>
            <Text style={styles.netWorthLabel}>NET WORTH</Text>
            <View style={styles.tag}>
              <Text style={styles.tagText}>CAD · {accounts.length} accounts</Text>
            </View>
          </View>
          <Text style={[styles.netWorthValue, netWorth < 0 ? styles.negText : null]}>
            {isMasked ? "••••••••" : formatCAD(netWorth)}
          </Text>

          {/* Balance Sheet Bar */}
          <View style={styles.bsBar}>
            <View style={[styles.bsCash, { width: `${Math.max(12, Math.min(88, cashRatio))}%` }]} />
            <View style={styles.bsDebt} />
          </View>

          <View style={styles.legendRow}>
            <View>
              <Text style={styles.legendLabel}>Cash in {accounts.filter((a) => a.type === "bank").length} accounts</Text>
              <Text style={styles.legendVal}>{isMasked ? "••••" : formatCAD(bankTotal)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.legendLabel}>Owed on {cards.length} cards</Text>
              <Text style={[styles.legendVal, styles.negText]}>{isMasked ? "••••" : formatCAD(debtTotal)}</Text>
            </View>
          </View>
        </View>

        {/* 30-Day Cash Runway Preview */}
        <View style={styles.runwayCard}>
          <View style={styles.nwRow}>
            <View>
              <Text style={styles.runwayLabel}>CASH RUNWAY · NEXT 30 DAYS</Text>
              <Text style={styles.runwaySub}>Lowest point $2,081 on Nov 12 · never below $0</Text>
            </View>
            <View style={styles.safeChip}>
              <Text style={styles.safeChipText}>Safe 30 days</Text>
            </View>
          </View>
          <View style={styles.milestonesRow}>
            <Text style={styles.milestone}>Today</Text>
            <Text style={styles.milestone}>+ Oct 30</Text>
            <Text style={styles.milestone}>− Nov 5</Text>
            <Text style={styles.milestone}>Nov 20</Text>
          </View>
        </View>

        {/* Cards Carousel */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Card wallet</Text>
          <Text style={styles.sectionSubtitle}>{cards.length} cards</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardCarousel}>
          {cards.map((c) => {
            const limit = c.credit_limit || 1000;
            const util = Math.round((Math.max(0, c.balance) / limit) * 100);
            const isAmex = c.account_name.toLowerCase().includes("essential");
            const isGreen = c.account_name.toLowerCase().includes("green");
            const isTD = c.bank_name.toLowerCase().includes("td");
            const isRog = c.bank_name.toLowerCase().includes("rogers");

            const cardBg = isAmex ? "#1D436C" : isGreen ? "#3B5542" : isTD ? "#1E5836" : isRog ? "#732424" : "#1A2B4C";

            return (
              <View key={c.id} style={[styles.creditCardBox, { backgroundColor: cardBg }]}>
                <View>
                  <Text style={styles.cardBank}>{c.bank_name}</Text>
                  <Text style={styles.cardName} numberOfLines={1}>{c.account_name}</Text>
                </View>
                <View>
                  <Text style={styles.cardBal}>{isMasked ? "••••" : formatCAD(c.balance)}</Text>
                  <View style={styles.utilRow}>
                    <View style={styles.utilTrack}>
                      <View
                        style={[
                          styles.utilFill,
                          {
                            width: `${Math.min(100, util)}%`,
                            backgroundColor: util >= 70 ? "#F87171" : util >= 30 ? "#FBBF24" : "#FFFFFF",
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.utilText}>{util}%</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Recent Ledger Activity */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Latest activity</Text>
          <Text style={styles.sectionSubtitle}>Synced 2 min ago</Text>
        </View>

        <View style={styles.ledgerCard}>
          {transactions.map((tx, idx) => {
            const isIncome = tx.amount > 0;
            const initial = (tx.merchant || tx.description || "T").charAt(0).toUpperCase();
            return (
              <View key={tx.id || idx} style={[styles.lRow, idx > 0 && styles.lRowBorder]}>
                <View style={[styles.monoAvatar, { backgroundColor: isIncome ? "#16835A" : "#13294B" }]}>
                  <Text style={styles.monoInitial}>{initial}</Text>
                </View>
                <View style={styles.lWho}>
                  <Text style={styles.lMerchant} numberOfLines={1}>{tx.merchant || tx.description}</Text>
                  <Text style={styles.lCat}>{tx.category} · {tx.date}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.lAmt, isIncome ? styles.posText : null]}>
                    {isIncome ? `+${formatCAD(tx.amount)}` : formatCAD(tx.amount)}
                  </Text>
                  {tx.status === "pending" && <Text style={styles.pendingBadge}>PENDING</Text>}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F5F9",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greetingSub: {
    fontSize: 12,
    color: "#5A6B80",
    fontWeight: "500",
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0E1726",
    letterSpacing: -0.3,
  },
  maskBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DFE5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  netWorthCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#DFE5EE",
    shadowColor: "#0E1726",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  nwRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  netWorthLabel: {
    color: "#5A6B80",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    backgroundColor: "#F3F5F9",
    borderWidth: 1,
    borderColor: "#DFE5EE",
  },
  tagText: {
    fontSize: 10.5,
    color: "#5A6B80",
    fontWeight: "600",
  },
  netWorthValue: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0E1726",
    letterSpacing: -0.8,
    marginTop: 8,
  },
  negText: {
    color: "#C23A2E",
  },
  posText: {
    color: "#16835A",
  },
  bsBar: {
    flexDirection: "row",
    height: 10,
    borderRadius: 99,
    overflow: "hidden",
    marginTop: 14,
    gap: 3,
  },
  bsCash: {
    backgroundColor: "#0E8A78",
    borderRadius: 99,
  },
  bsDebt: {
    flex: 1,
    backgroundColor: "#C23A2E",
    borderRadius: 99,
    opacity: 0.85,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  legendLabel: {
    fontSize: 11,
    color: "#5A6B80",
  },
  legendVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0E1726",
    marginTop: 2,
  },
  runwayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#DFE5EE",
  },
  runwayLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#5A6B80",
    letterSpacing: 0.6,
  },
  runwaySub: {
    fontSize: 11.5,
    color: "#5A6B80",
    marginTop: 3,
  },
  safeChip: {
    backgroundColor: "#E2F2EA",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  safeChipText: {
    fontSize: 10,
    color: "#16835A",
    fontWeight: "700",
  },
  milestonesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#EAEFF5",
  },
  milestone: {
    fontSize: 10.5,
    color: "#8A99AD",
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0E1726",
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: "#5A6B80",
  },
  cardCarousel: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  creditCardBox: {
    width: 175,
    height: 110,
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
    justifyContent: "space-between",
  },
  cardBank: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cardName: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  cardBal: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  utilRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  utilTrack: {
    flex: 1,
    height: 3.5,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  utilFill: {
    height: "100%",
    borderRadius: 99,
  },
  utilText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    fontWeight: "600",
  },
  ledgerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DFE5EE",
    paddingHorizontal: 14,
  },
  lRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  lRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "#EAEFF5",
  },
  monoAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  monoInitial: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  lWho: {
    flex: 1,
    marginRight: 8,
  },
  lMerchant: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0E1726",
  },
  lCat: {
    fontSize: 11,
    color: "#5A6B80",
    marginTop: 2,
  },
  lAmt: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0E1726",
  },
  pendingBadge: {
    fontSize: 9,
    fontWeight: "700",
    color: "#B8770A",
    backgroundColor: "#FBF0DA",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
});
