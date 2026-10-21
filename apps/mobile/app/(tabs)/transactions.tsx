import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, SafeAreaView } from "react-native";
import { formatCAD } from "@financeos/shared";
import { SEED_TRANSACTIONS_FALLBACK } from "../../src/lib/api";
import { Search, Filter, ArrowDownRight, ArrowUpRight } from "lucide-react-native";

export default function MobileTransactions() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "expenses" | "income" | "pending">("all");
  const [transactions] = useState(SEED_TRANSACTIONS_FALLBACK);

  const filtered = transactions.filter((t) => {
    const matchSearch =
      t.merchant.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;
    if (filter === "expenses") return t.amount < 0;
    if (filter === "income") return t.amount > 0;
    if (filter === "pending") return t.status === "pending";
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.headerBox}>
        <View style={styles.searchBar}>
          <Search size={16} color="#94A3B8" />
          <TextInput
            placeholder="Search merchant, category, or note..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(["all", "expenses", "income", "pending"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterPill,
                filter === f && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Transactions List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.txRow}>
            <View style={styles.iconBox}>
              {item.amount > 0 ? (
                <ArrowDownRight size={18} color="#10B981" />
              ) : (
                <ArrowUpRight size={18} color="#64748B" />
              )}
            </View>
            <View style={styles.txMeta}>
              <Text style={styles.merchantText} numberOfLines={1}>
                {item.merchant || item.description}
              </Text>
              <Text style={styles.categoryDateText}>
                {item.category} • {item.date}
              </Text>
            </View>
            <View style={styles.txAmountBox}>
              <Text
                style={[
                  styles.amountText,
                  { color: item.amount > 0 ? "#10B981" : "#0F172A" }
                ]}
              >
                {item.amount > 0 ? `+${formatCAD(item.amount)}` : formatCAD(item.amount)}
              </Text>
              {item.status === "pending" && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>HOLD</Text>
                </View>
              )}
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
  headerBox: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterPillActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  filterText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: 16,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  txMeta: {
    flex: 1,
  },
  merchantText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  categoryDateText: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  txAmountBox: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 14,
    fontWeight: "700",
  },
  pendingBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  pendingBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#D97706",
  },
});
