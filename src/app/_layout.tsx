// src/app/_layout.tsx
import { Stack } from 'expo-router';
import { AuthProvider } from '../providers/AuthProvider';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Colors } from '../constants/colors'; // Import colors

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // We map your brand names to the font files
    'Brand_Heading': require('../../assets/fonts/TimesNewRomanMTCondensed-Bold.otf'), // Or TimesNewRoman.ttf
    'Brand_Body': require('../../assets/fonts/NeueMontreal-Regular.otf'), // Or NeueMontreal.ttf
    'Brand_Body_Bold': require('../../assets/fonts/NeueMontreal-Bold.otf'),
    'Brand_Italic': require('../../assets/fonts/TimesNew RomanMTCondensed-Regular.otf'), 
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <Stack screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: Colors.primary } // Set global background
      }}>
        <Stack.Screen name="meditate" options={{ presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}