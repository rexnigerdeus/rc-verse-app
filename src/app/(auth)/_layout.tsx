// src/app/(auth)/_layout.tsx

import { router, Stack } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../../providers/AuthProvider";

export default function AuthLayout() {
  const { session } = useAuth();

  useEffect(() => {
    // If the session exists, it means the user is signed in.
    if (session) {
      // Redirect them to the main app screen.
      router.replace("/(app)");
    }
  }, [session]);

  // This stack will render the login or sign-up screen.
  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ headerShown: false }} />
    </Stack>
  );
}
