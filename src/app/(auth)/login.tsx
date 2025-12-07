// src/app/(auth)/login.tsx

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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert(i18n.t("errors.login"), i18n.t("errors.missingFields"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert(i18n.t("errors.login"), error.message);
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={{ marginBottom: 40 }}>
        <BrandLogo />
      </View>
      <Text style={styles.title}>{i18n.t("login.title")}</Text>
      <Text style={styles.subtitle}>{i18n.t("login.subtitle")}</Text>

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

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? i18n.t("login.loading") : i18n.t("login.button")}
        </Text>
      </Pressable>

      <Link href="/(auth)/sign-up" asChild>
        <Pressable style={styles.linkButton}>
          <Text style={styles.linkText}>{i18n.t("login.link")}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

// Add this StyleSheet at the bottom
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
