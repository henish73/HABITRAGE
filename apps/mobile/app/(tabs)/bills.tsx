import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from "react-native";
import { formatCAD } from "@financeos/shared";
import { Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react-native";

interface MobileBill {
  id: string;
  name: string;
  amount: number;
  type: string;
  due_day: number;
  next_due_date: string;
  is_paid: boolean;
  autopay: boolean;
}

const INITIAL_BILLS: MobileBill[] = [
  { id: "b1", name: "Apartment Rent", amount: 1950.00, type: "rent", due_day: 1, next_due_date: "2024-11-01", is_paid: false, autopay: false },
  { id: "b2", name: "Rogers Home Internet", amount: 105.00, type: "utility", due_day: 15, next_due_date: "2024-10-15", is_paid: false, autopay: true },
  { id: "b3", name: "Hydro One Utilities", amount: 84.50, type: "utility", due_day: 22, next_due_date: "2024-10-22", is_paid: false, autopay: true },
  { id: "b4", name: "CIBC Dividend Visa Minimum", amount: 142.05, type: "credit_card", due_day: 28, next_due_date: "2024-10-28", is_paid: false, autopay: false },
];

export default function MobileBills() {
  const [bills, setBills] = useState(INITIAL_BILLS);

  const togglePaid = (id: string) => {
    setBills((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_paid: !b.is_paid } : b))
    );
  };

  const totalMonthlyBills = bills.reduce((sum, b) => sum + b.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Metric */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>TOTAL RECURRING EXPENSES</Text>
        <Text style={styles.summaryValue}>{formatCAD(totalMonthlyBills)}/mo</Text>
        <Text style={styles.summarySub}>4 tracked commitments • Auto-notifications active</Text>
      </View>

      {/* Bills List */}
      <FlatList
        data={bills}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
                onPress={() => togglePaid(item.id)}
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
