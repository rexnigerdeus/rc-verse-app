import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../providers/ThemeProvider'; 

interface ScreenWrapperProps extends ViewProps {
  children: React.ReactNode;
}

export function ScreenWrapper({ children, style, ...rest }: ScreenWrapperProps) {
  // Récupère les dimensions de la zone de sécurité (encoche, Dynamic Island)
  const insets = useSafeAreaInsets();
  
  // Récupère les couleurs dynamiques basées sur le mode (clair ou sombre)
  const { colors } = useTheme();

  return (
    <View 
      style={[
        styles.container, 
        { 
          paddingTop: insets.top, // Ajoute la marge exacte pour l'iPhone actuel
          paddingBottom: insets.bottom > 0 ? insets.bottom : 0, // Gère aussi la barre d'accueil en bas
          backgroundColor: colors.primary, // Applique la couleur de fond dynamiquement
        }, 
        style
      ]} 
      {...rest}
    >
      {children}
    </View>
  );
}

// Le StyleSheet ne conserve que les propriétés structurelles (statiques)
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});