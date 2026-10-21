import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from "react-native";
import { formatCAD } from "@financeos/shared";
import { SEED_ACCOUNTS_FALLBACK, fetchAccounts, MobileAccount } from "../../src/lib/api";
import { Landmark, CreditCard, ShieldCheck } from "lucide-react-native";

export default function MobileAccounts() {
  const [accounts, setAccounts] = useState<MobileAccount[]>(SEED_ACCOUNTS_FALLBACK);

  useEffect(() => {
    fetchAccounts().then((accs) => {
      if (accs && accs.length > 0) setAccounts(accs);
    });
  }, []);

  const bankAccounts = accounts.filter((a) => a.type === "bank");
  const creditCards = accounts.filter((a) => a.type === "credit_card");


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Bank Accounts Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Landmark size={18} color="#0F172A" />
            <Text style={styles.sectionTitle}>Bank Accounts ({bankAccounts.length})</Text>
          </View>
          <View style={styles.cardGroup}>
            {bankAccounts.map((acc) => (
              <View key={acc.id} style={styles.accountRow}>
                <View style={styles.bankTagBox}>
                  <Text style={styles.bankTagText}>{acc.bank_name}</Text>
                </View>
                <View style={styles.accountMeta}>
                  <Text style={styles.accountName}>{acc.account_name}</Text>
                  <Text style={styles.accountNumber}>{acc.account_number}</Text>
                </View>
                <Text style={styles.accountBalance}>{formatCAD(acc.balance)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Credit Cards Section */}
        <View style={[styles.section, { marginTop: 24 }]}>
          <View style={styles.sectionTitleRow}>
            <CreditCard size={18} color="#0F172A" />
            <Text style={styles.sectionTitle}>Credit Cards ({creditCards.length})</Text>
          </View>
          <View style={styles.cardGroup}>
            {creditCards.map((card) => {
              const util = card.credit_limit ? Math.round((card.balance / card.credit_limit) * 100) : 0;
              return (
                <View key={card.id} style={styles.creditCardRow}>
                  <View style={styles.cardHeader}>
                    <View style={styles.bankTagBox}>
                      <Text style={styles.bankTagText}>{card.bank_name}</Text>
                    </View>
                    <Text style={styles.accountNumber}>{card.account_number}</Text>
                  </View>

                  <View style={styles.cardMiddle}>
                    <Text style={styles.accountName}>{card.account_name}</Text>
                    <Text style={styles.cardBalance}>{formatCAD(card.balance)}</Text>
                  </View>

                  {card.credit_limit && (
                    <View style={styles.limitContainer}>
                      <View style={styles.limitBarBackground}>
                        <View
                          style={[
                            styles.limitBarFill,
                            {
                              width: `${Math.min(util, 100)}%`,
                              backgroundColor: util > 30 ? "#F59E0B" : "#10B981"
                            }
                          ]}
                        />
                      </View>
                      <View style={styles.limitLabelRow}>
                        <Text style={styles.limitText}>Limit: {formatCAD(card.credit_limit)}</Text>
                        <Text style={[styles.limitText, { fontWeight: "700" }]}>{util}% Utilized</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
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
  section: {},
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  bankTagBox: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  bankTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
  },
  accountMeta: {
    flex: 1,
  },
  accountName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  accountNumber: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  accountBalance: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  creditCardRow: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardMiddle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 12,
  },
  cardBalance: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  limitContainer: {
    marginTop: 4,
  },
  limitBarBackground: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
  },
  limitBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  limitLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  limitText: {
    fontSize: 10,
    color: "#64748B",
  },
});
