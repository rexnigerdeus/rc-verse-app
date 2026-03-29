import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';

interface ScreenWrapperProps extends ViewProps {
  children: React.ReactNode;
}

export function ScreenWrapper({ children, style, ...rest }: ScreenWrapperProps) {
  // Récupère les dimensions de la zone de sécurité (encoche, Dynamic Island)
  const insets = useSafeAreaInsets();

  return (
    <View 
      style={[
        styles.container, 
        { 
          paddingTop: insets.top, // Ajoute la marge exacte pour l'iPhone actuel
          paddingBottom: insets.bottom > 0 ? insets.bottom : 0 // Gère aussi la barre d'accueil en bas si besoin
        }, 
        style
      ]} 
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // On met la couleur de fond globale de l'app ici. 
    // Ainsi, elle montera bien derrière la barre de statut (l'heure/batterie).
    backgroundColor: Colors.primary, 
  },
});