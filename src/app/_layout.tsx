import { Slot, SplashScreen, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "../providers/AuthProvider";
import { ThemeProvider, useTheme } from "../providers/ThemeProvider";
import { ErrorBoundary } from "../components/ErrorBoundary";
import Head from "expo-router/head";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  
  // 1. On récupère nos couleurs dynamiques ici !
  const { colors } = useTheme(); 

  // 2. Load Fonts
  const [fontsLoaded] = useFonts({
    'Brand_Heading': require('../../assets/fonts/LibreBaskerville-Bold.ttf'), 
    'Brand_Body': require('../../assets/fonts/GoogleSans-Regular.ttf'),
    'Brand_Body_Bold': require('../../assets/fonts/GoogleSans-Bold.ttf'), 
    'Brand_Italic': require('../../assets/fonts/LibreBaskerville-Italic.ttf'),
  });

  // 3. Hide Splash Screen
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // 4. TRAFFIC CONTROL
  useEffect(() => {
    if (!rootNavigationState?.key) return;
    if (loading) return; 

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    if (session && !inAppGroup) {
      router.replace('/(app)'); 
    } else if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [session, loading, segments, rootNavigationState?.key]);

  // Loading State (Corrigé avec `colors` en minuscule)
  if (loading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// Sous-composant pour utiliser useTheme() pour le fond web
function RootLayoutContent() {
  const { colors } = useTheme();

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <style>{`
          html, body, #root {
            height: 100%; width: 100%; overflow: hidden;
            background-color: ${colors.primary};
          }
        `}</style>
      </Head>
      <InitialLayout />
    </>
  );
}