import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from "react-native";
import { Redirect } from "expo-router";
import { Lock } from "lucide-react-native";
import { useSession, tokens } from "../src/lib/api";

export default function LoginScreen() {
  const { token, signIn } = useSession();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const c = tokens.colors[scheme];

  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (token) return <Redirect href="/" />;

  const submit = async () => {
    if (!passcode.trim()) {
      setError("Enter your passcode.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(passcode.trim());
      setPasscode("");
    } catch (err: any) {
      setError(err?.message || "Sign-in failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.screen, { backgroundColor: c.vault }]}
    >
      <View style={styles.body}>
        <View style={[styles.badge, { backgroundColor: c.teal }]}>
          <Lock size={26} color="#FFFFFF" />
        </View>
        <Text style={[styles.title, { color: c.vaultInk }]}>FinanceOS is locked</Text>
        <Text style={[styles.sub, { color: c.vaultMuted }]}>Enter your vault passcode to continue.</Text>

        <TextInput
          value={passcode}
          onChangeText={setPasscode}
          placeholder="Passcode"
          placeholderTextColor={c.vaultMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={submit}
          editable={!busy}
          style={[styles.input, { color: c.vaultInk, borderColor: c.vaultMuted }]}
          accessibilityLabel="Vault passcode"
        />

        {error ? <Text style={[styles.error, { color: tokens.colors.dark.neg }]}>{error}</Text> : null}

        <TouchableOpacity
          onPress={submit}
          disabled={busy}
          style={[styles.button, { backgroundColor: c.teal, opacity: busy ? 0.7 : 1 }]}
          accessibilityRole="button"
        >
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Unlock</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28, gap: 14 },
  badge: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4 },
  sub: { fontSize: 14, marginBottom: 8, textAlign: "center" },
  input: { width: "100%", height: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 16 },
  error: { fontSize: 13, alignSelf: "flex-start" },
  button: { width: "100%", height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
