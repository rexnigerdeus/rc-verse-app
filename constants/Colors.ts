// src/constants/colors.ts

export const lightColors = {
  primary: '#F6F7F9',        // Fond principal crème/gris très clair
  surface: '#FFFFFF',        // Cartes blanches pures
  surfaceHighlight: '#FDFDFD', // Nuance légère
  
  text: '#111827',           // Noir charbon pour une lecture optimale
  textSecondary: '#6B7280',  // Gris moyen pour les sous-titres
  textTertiary: '#9CA3AF',   // Gris clair
  
  accent: '#FFB23F',         // Jaune/Orange chaleureux (inspiré du "pebble")
  accentSecondary: '#A855F7',// Violet moderne
  accentBackground: 'rgba(255, 178, 63, 0.15)', // Fond de l'accent
  
  highlight: '#A5D6A7',      // Vert doux
  border: '#E5E7EB',         // Bordures subtiles
  error: '#EF5350',
  success: '#4CD964',
  
  tabBar: '#FFFFFF',
  backdrop: 'rgba(0,0,0,0.3)',
};

export const darkColors = {
  primary: '#1A1C1E',        // Deep Slate (Existant)
  surface: '#25282B',        // Cartes sombres
  surfaceHighlight: '#32363A', 
  
  text: '#E3E3E3',           // Blanc cassé (Existant)
  textSecondary: '#9CA3AF',  // Gris text
  textTertiary: '#6B7280',   
  
  accent: '#A5D6A7',         // Vert Sauge (Existant pour la cohérence sombre)
  accentSecondary: '#A855F7',// Violet
  accentBackground: 'rgba(165, 214, 167, 0.15)', 
  
  highlight: '#FFB74D',      // Ambre
  border: '#363A3E',         // Bordures sombres
  error: '#EF9A9A',
  success: '#A5D6A7',
  
  tabBar: '#1A1C1E',
  backdrop: 'rgba(0,0,0,0.6)',
};

// Type pour s'assurer que les deux thèmes ont exactement les mêmes clés
export type ColorTheme = typeof lightColors;