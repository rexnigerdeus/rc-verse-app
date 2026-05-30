import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

// This page is just a placeholder. 
// The real logic is in src/app/_layout.tsx which redirects the user 
// to either (auth)/sign-in or (app)/index based on login status.

export default function StartPage() {
  // 1. Récupération des couleurs dynamiques
  const { colors } = useTheme();
  // 2. Génération des styles
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});