// src/components/BrandLogo.tsx
import { Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

export default function BrandLogo() {
  return <Text style={styles.logoText}>REVIVAL CULTURE ABIDJAN</Text>;
}

const styles = StyleSheet.create({
  logoText: {
    fontFamily: 'Brand_Heading', // Serif Font
    fontSize: 20,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 1.5, // Condensed fonts look great with spacing
    textTransform: 'uppercase',
  },
});