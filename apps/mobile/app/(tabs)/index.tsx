import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from "react-native";
import { formatCAD } from "@financeos/shared";
import { SEED_ACCOUNTS_FALLBACK, SEED_TRANSACTIONS_FALLBACK } from "../../src/lib/api";
import { TrendingUp, ArrowDownRight, ArrowUpRight, ShieldCheck, CreditCard } from "lucide-react-native";

export default function MobileDashboard() {
  const [accounts] = useState(SEED_ACCOUNTS_FALLBACK);
  const [transactions] = useState(SEED_TRANSACTIONS_FALLBACK);

  const bankTotal = accounts
    .filter((a) => a.type === "bank")
    .reduce((sum, a) => sum + a.balance, 0);

  const debtTotal = accounts
    .filter((a) => a.type === "credit_card")
    .reduce((sum, a) => sum + a.balance, 0);

  const netWorth = bankTotal - debtTotal;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Net Worth Card */}
        <View style={styles.netWorthCard}>
          <Text style={styles.netWorthLabel}>TOTAL NET WORTH</Text>
          <Text style={styles.netWorthValue}>{formatCAD(netWorth)}</Text>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownSub}>Cash Assets</Text>
              <Text style={[styles.breakdownVal, { color: "#10B981" }]}>+{formatCAD(bankTotal)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownSub}>Revolving Debt</Text>
              <Text style={[styles.breakdownVal, { color: "#F43F5E" }]}>-{formatCAD(debtTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Accounts Horizontal Carousel */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Accounts & Cards</Text>
          <Text style={styles.sectionSubtitle}>{accounts.length} active lines</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountCarousel}>
          {accounts.map((acc) => (
            <View key={acc.id} style={styles.accountCard}>
              <View style={styles.cardTop}>
                <Text style={styles.bankTag}>{acc.bank_name}</Text>
                <Text style={styles.accountNum}>{acc.account_number}</Text>
              </View>
              <Text style={styles.accountName} numberOfLines={1}>
                {acc.account_name}
              </Text>
              <Text style={styles.accountBalance}>{formatCAD(acc.balance)}</Text>
              {acc.credit_limit && (
                <Text style={styles.creditLimit}>Limit: {formatCAD(acc.credit_limit)}</Text>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Recent Activity */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <Text style={styles.sectionLink}>View All</Text>
        </View>

        <View style={styles.transactionList}>
          {transactions.map((tx) => (
            <View key={tx.id} style={styles.txItem}>
              <View style={styles.txIconBox}>
                {tx.amount > 0 ? (
                  <ArrowDownRight color="#10B981" size={18} />
                ) : (
                  <ArrowUpRight color="#64748B" size={18} />
                )}
              </View>
              <View style={styles.txDetails}>
                <Text style={styles.txMerchant} numberOfLines={1}>
                  {tx.merchant || tx.description}
                </Text>
                <Text style={styles.txCategory}>{tx.category} • {tx.date}</Text>
              </View>
              <View style={styles.txAmountCol}>
                <Text
                  style={[
                    styles.txAmount,
                    { color: tx.amount > 0 ? "#10B981" : "#0F172A" }
                  ]}
                >
                  {tx.amount > 0 ? `+${formatCAD(tx.amount)}` : formatCAD(tx.amount)}
                </Text>
                {tx.status === "pending" && (
                  <Text style={styles.pendingBadge}>PENDING</Text>
                )}
              </View>
            </View>
          ))}
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
  netWorthCard: {
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  netWorthLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  netWorthValue: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 8,
    letterSpacing: -0.5,
  },
  breakdownRow: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  breakdownItem: {
    flex: 1,
  },
  divider: {
    width: 1,
    backgroundColor: "#1E293B",
    marginHorizontal: 16,
  },
  breakdownSub: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "500",
  },
  breakdownVal: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0284C7",
  },
  accountCarousel: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  accountCard: {
    width: 180,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bankTag: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0284C7",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  accountNum: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
  accountName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  creditLimit: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4,
  },
  transactionList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  txItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  txIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
  },
  txMerchant: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  txCategory: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  txAmountCol: {
    alignItems: "flex-end",
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  pendingBadge: {
    fontSize: 8,
    fontWeight: "700",
    color: "#D97706",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
});
