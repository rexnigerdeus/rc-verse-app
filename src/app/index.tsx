// src/app/index.tsx

import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Colors } from "../constants/colors";
import { useAuth } from "../providers/AuthProvider";

export default function StartPage() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      // Still waiting for session info
      return;
    }

    if (session) {
      // User is signed in, go to the main app
      router.replace("/(app)");
    } else {
      // User is not signed in, go to the login page
      router.replace("/(auth)/login");
    }
  }, [session, loading]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        backgroundColor: Colors.primary,
      }}
    >
      <ActivityIndicator size="large" color={Colors.text} />
    </View>
  );
}
