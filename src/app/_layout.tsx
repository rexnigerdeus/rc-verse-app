import { Slot, SplashScreen, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { View, ActivityIndicator, Platform } from "react-native";
import { AuthProvider, useAuth } from "../providers/AuthProvider";
import { Colors } from "../constants/colors";
import Head from "expo-router/head"; // <--- IMPORT THIS

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // 1. Load Fonts
  const [fontsLoaded] = useFonts({
    'Brand_Heading': require('../../assets/fonts/Cinzel-VariableFont_wght.ttf'),
    'Brand_Body': require('../../assets/fonts/FaunaOne-Regular.ttf'),
    'Brand_Body_Bold': require('../../assets/fonts/FaunaOne-Regular.ttf'), 
  });

  // 2. Hide Splash Screen
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // 3. TRAFFIC CONTROL
  useEffect(() => {
    if (loading) return; 

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    if (session && !inAppGroup) {
      router.replace('/(app)'); 
    } else if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [session, loading, segments]);

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