// src/app/(auth)/sign-up.tsx

import { Link } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import BrandLogo from "../../components/BrandLogo";
import { Colors } from "../../constants/colors";
import i18n from "../../lib/i18n";
import { supabase } from "../../lib/supabase";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // NEW state
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    // NEW: Validation check
    if (password !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={{ marginBottom: 40 }}>
        <BrandLogo />
      </View>
      <Text style={styles.title}>{i18n.t("signUp.title")}</Text>
      <Text style={styles.subtitle}>{i18n.t("signUp.subtitle")}</Text>

      <TextInput
        style={styles.input}
        placeholder={i18n.t("login.email")}
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder={i18n.t("login.password")}
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {/* NEW: Confirm Password Input */}
      <TextInput
        style={styles.input}
        placeholder={i18n.t("signUp.confirmPassword")}
        placeholderTextColor="#888"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? i18n.t("signUp.loading") : i18n.t("signUp.button")}
        </Text>
      </Pressable>

      <Link href="/(auth)/login" asChild>
        <Pressable style={styles.linkButton}>
          <Text style={styles.linkText}>{i18n.t("signUp.link")}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

// Use the same styles from login.tsx or copy them here
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: Colors.primary,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 32,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginBottom: 40,
  },
  input: {
    fontFamily: "Outfit_400Regular",
    backgroundColor: "rgba(0,0,0,0.2)",
    color: Colors.text,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  button: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontFamily: "Outfit_700Bold",
    color: Colors.primary,
    fontSize: 16,
  },
  linkButton: {
    marginTop: 20,
    alignItems: "center",
  },
  linkText: {
    fontFamily: "Outfit_400Regular",
    color: Colors.text,
    fontSize: 14,
  },
});
