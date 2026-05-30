// src/providers/ThemeProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, ColorTheme } from '../constants/colors';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ColorTheme;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  isDark: true,
  colors: darkColors,
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Charger le thème sauvegardé au démarrage
    AsyncStorage.getItem('app_theme_mode').then((savedMode) => {
      if (savedMode) setModeState(savedMode as ThemeMode);
      setIsLoaded(true);
    });
  }, []);

  const setTheme = async (newMode: ThemeMode) => {
    setModeState(newMode);
    await AsyncStorage.setItem('app_theme_mode', newMode);
  };

  if (!isLoaded) return null;

  // Calcul du thème actuel (si system, on regarde le téléphone)
  const isDark = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}