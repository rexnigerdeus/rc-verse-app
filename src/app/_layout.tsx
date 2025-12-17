import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { Colors } from '../constants/colors';
import { router } from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // 1. Load Fonts
  const [fontsLoaded] = useFonts({
    'Brand_Heading': require('../../assets/fonts/TimesNewRomanMTCondensed-Bold.otf'),
    'Brand_Body': require('../../assets/fonts/NeueMontreal-Regular.otf'),
    'Brand_Body_Bold': require('../../assets/fonts/NeueMontreal-Bold.otf'), 
  });

  // 2. Hide Splash Screen
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // 3. TRAFFIC CONTROL (The Fix)
  useEffect(() => {
    if (loading) return; // Still checking session? Do nothing.

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    if (session && !inAppGroup) {
      // CASE 1: Logged in, but NOT in the main app (e.g. on "/" or in "sign-in")
      // Redirect to the meditation screen (a safe, known file)
      router.replace('/(app)/meditate'); 
    } else if (!session && !inAuthGroup) {
      // CASE 2: Not logged in, and NOT in the auth group (e.g. on "/")
      // Redirect to sign in
      router.replace('/(auth)/login');
    }
  }, [session, loading, segments]);

  // 4. Loading State
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  // 5. Render
  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}