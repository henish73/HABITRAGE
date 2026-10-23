import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Alert } from "react-native";
import { fetchBills, payBill, MobileBill } from "../../src/lib/api";
import { formatCAD } from "@financeos/shared";
import { Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react-native";

export default function MobileBills() {
  const [bills, setBills] = useState<MobileBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBills(await fetchBills());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmPay = (bill: MobileBill) => {
    Alert.alert(
      `Mark ${bill.name} paid?`,
      `This records a ${formatCAD(bill.amount)} payment and moves the due date to the next cycle.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark paid",
          onPress: async () => {
            setPayingId(bill.id);
            try {
              await payBill(bill.id);
              await load();
            } catch (err: any) {
              Alert.alert("Not paid", err?.message || "Try again.");
            } finally {
              setPayingId(null);
            }
          },
        },
      ]
    );
  };

  const totalMonthlyBills = bills.reduce((sum, b) => sum + b.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Metric */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>TOTAL RECURRING EXPENSES</Text>
        <Text style={styles.summaryValue}>{formatCAD(totalMonthlyBills)}/mo</Text>
        <Text style={styles.summarySub}>{loading ? "Loading bills…" : `${bills.length} tracked bill${bills.length === 1 ? "" : "s"}`}</Text>
      </View>

      {/* Bills List */}
      <FlatList
        data={bills}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          loading ? null : (
            <Text style={styles.summarySub}>No bills yet. Add one from the web app's Plan page.</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.billCard, item.is_paid && styles.billCardPaid]}>
            <View style={styles.billMainRow}>
              <View style={styles.billMeta}>
                <Text style={[styles.billName, item.is_paid && styles.billTextPaid]}>
                  {item.name}
                </Text>
                <View style={styles.tagRow}>
                  <Text style={styles.typeTag}>{item.type.toUpperCase()}</Text>
                  <Text style={styles.dueText}>Due {item.next_due_date}</Text>
                </View>
              </View>
              <Text style={[styles.billAmount, item.is_paid && styles.billTextPaid]}>
                {formatCAD(item.amount)}
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.autopayBadge}>
                <Clock size={12} color="#64748B" />
                <Text style={styles.autopayText}>
                  {item.autopay ? "Autopay Enabled" : "Manual Payment"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => confirmPay(item)}
                disabled={item.is_paid || payingId === item.id}
                style={[styles.payButton, item.is_paid && styles.payButtonPaid]}
              >
                <CheckCircle2 size={14} color={item.is_paid ? "#10B981" : "#FFFFFF"} />
                <Text style={[styles.payButtonText, item.is_paid && styles.payButtonTextPaid]}>
                  {item.is_paid ? "Paid" : "Mark Paid"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },
  summarySub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  billCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  billCardPaid: {
    opacity: 0.7,
    backgroundColor: "#F8FAFC",
  },
  billMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  billMeta: {
    flex: 1,
  },
  billName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  typeTag: {
    fontSize: 9,
    fontWeight: "700",
    color: "#0284C7",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dueText: {
    fontSize: 11,
    color: "#64748B",
  },
  billAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  billTextPaid: {
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  autopayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  autopayText: {
    fontSize: 11,
    color: "#64748B",
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  payButtonPaid: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  payButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  payButtonTextPaid: {
    color: "#10B981",
  },
});
