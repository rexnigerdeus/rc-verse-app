import { Slot, SplashScreen, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "../providers/AuthProvider";
import { Colors } from "../constants/colors";
import Head from "expo-router/head";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  // FIX: Get the navigation state to ensure the tree is ready before redirecting
  const rootNavigationState = useRootNavigationState();

  // 1. Load Fonts
  const [fontsLoaded] = useFonts({
    'Brand_Heading': require('../../assets/fonts/Vollkorn-Medium.ttf'),
    'Brand_Body': require('../../assets/fonts/NeueMontreal-Regular.otf'),
    'Brand_Body_Bold': require('../../assets/fonts/NeueMontreal-Bold.otf'), 
  });

  // 2. Hide Splash Screen
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // 3. TRAFFIC CONTROL
  useEffect(() => {
    // FIX: Check if navigation is ready. If not, do not attempt to redirect yet.
    if (!rootNavigationState?.key) return;

    if (loading) return; 

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    if (session && !inAppGroup) {
      router.replace('/(app)'); 
    } else if (!session && !inAuthGroup) {
      // Ensure we don't redirect to login if we are already there (prevents loops)
      router.replace('/(auth)/login');
    }
  }, [session, loading, segments, rootNavigationState?.key]); // Add navigation key to dependencies

  // Loading State
  if (loading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      {/* --- THIS IS THE FIX FOR MOBILE RESPONSIVENESS --- */}
      <Head>
        <meta 
          name="viewport" 
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" 
        />
        <style>{`
          /* Critical CSS to force full height on mobile browsers */
          html, body, #root {
            height: 100%;
            width: 100%;
            overflow: hidden; /* Prevents bouncing scroll on iOS */
            background-color: ${Colors.primary};
          }
        `}</style>
      </Head>

      <InitialLayout />
    </AuthProvider>
  );
}