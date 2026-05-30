// src/constants/colors.ts

export const lightColors = {
  // Arrière-plans[cite: 10]
  primary: '#F3EDE2',        // Fond principal de l'application (Crème chaud)[cite: 10]
  surfaceBase: '#FDFAF6',    // Surface standard, zones neutres[cite: 10]
  surface: '#FFFFFF',        // Cartes, modales, feuilles[cite: 10]
  surfaceDeep: '#EAE4D8',    // Zones enfoncées, champs de saisie[cite: 10]
  
  // Typographie[cite: 10]
  text: '#1A1714',           // Titres et texte principal[cite: 10]
  textSecondary: '#6A6258',  // Corps de texte, descriptions[cite: 10]
  textTertiary: '#9C938A',   // Placeholders, éléments inactifs[cite: 10]
  
  // Accents de marque[cite: 10]
  accentSecondary: '#9B7EBD',// Couleur signature, focus (Violet)[cite: 10]
  accentWarm: '#F0A868',     // Chaleur et énergie, gradient héros (Pêche)[cite: 10]
  accent: '#F0B030',         // Activation, récompenses, badges (Or)[cite: 10]
  
  // Fonctionnel[cite: 10]
  ctaFill: '#1A1714',        // Fond bouton d'action principal[cite: 10]
  ctaText: '#F3EDE2',        // Texte bouton d'action principal (Crème)
  error: '#E8451F',          // Notifications, badge «Nouveau»[cite: 10]
  border: '#E5DDD2',         // Bordures et séparateurs[cite: 10]
  
  // Catégories zen (utilisées pour des backgrounds subtils)[cite: 10]
  zenSand: '#E8DFB5',        //[cite: 10]
  zenLavender: '#CDB8E8',    //[cite: 10]
  zenBlush: '#EECACA',       //[cite: 10]
  zenSage: '#C5DDD0',        //[cite: 10]
  
  tabBar: '#F3EDE2',
  backdrop: 'rgba(26, 23, 20, 0.4)',
};

export const darkColors = {
  // Arrière-plans[cite: 10]
  primary: '#1C1812',        // Fond principal (nuit chaude)[cite: 10]
  surfaceBase: '#231F18',    // Surface de base sombre[cite: 10]
  surface: '#2C2820',        // Cartes, modales sombres[cite: 10]
  surfaceDeep: '#171410',    // Zones enfoncées sombres[cite: 10]
  
  // Typographie[cite: 10]
  text: '#F0EDE5',           // Titres et texte principal[cite: 10]
  textSecondary: '#9E968D',  // Corps de texte, descriptions[cite: 10]
  textTertiary: '#6A6258',   // Placeholders, éléments inactifs[cite: 10]
  
  // Accents de marque[cite: 10]
  accentSecondary: '#B89FD8',// Couleur signature (éclaircie)[cite: 10]
  accentWarm: '#F0A060',     // Pêche lumineuse, gradient[cite: 10]
  accent: '#E8A818',         // Or lumineux, activation[cite: 10]
  
  // Fonctionnel[cite: 10]
  ctaFill: '#F0EDE5',        // Fond bouton d'action (inversé)[cite: 10]
  ctaText: '#1C1812',        // Texte bouton d'action (Noir brun)
  error: '#EF5E3A',          // Notifications, badge «Nouveau»[cite: 10]
  border: '#2E2A20',         // Bordures et séparateurs[cite: 10]
  
  // Catégories zen[cite: 10]
  zenSand: '#312C1C',        //[cite: 10]
  zenLavender: '#302048',    //[cite: 10]
  zenBlush: '#3C2222',       //[cite: 10]
  zenSage: '#1A2E26',        //[cite: 10]
  
  tabBar: '#1C1812',
  backdrop: 'rgba(0, 0, 0, 0.6)',
};

export type ColorTheme = typeof lightColors;