// src/components/OfflineBanner.tsx
//
// Bannière discrète en haut de l'écran quand l'app est hors ligne.
// Apparaît avec un slide-down, disparaît avec un slide-up.
// Design : fond ambre (warning, jamais rouge pour éviter le stress),
// icône Wifi-off, texte court et rassurant.

import { Feather } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useTheme } from '../providers/ThemeProvider';

interface OfflineBannerProps {
  /** Optionnel : message custom (sinon, message par défaut) */
  message?: string;
}

export function OfflineBanner({ message }: OfflineBannerProps) {
  const { isConnected } = useNetworkStatus();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  if (isConnected) return null;

  // Couleurs : ambre doux, lisible sur fond clair ET sombre
  const bgColor = isDark ? '#3A2A14' : '#FFF4E0';
  const textColor = isDark ? '#F0B030' : '#8B5A1B';
  const iconColor = textColor;

  return (
    <MotiView
      from={{ translateY: -50, opacity: 0 }}
      animate={{ translateY: 0, opacity: 1 }}
      exit={{ translateY: -50, opacity: 0 }}
      transition={{ type: 'timing', duration: 250 }}
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          paddingTop: Platform.OS === 'web' ? 8 : insets.top + 4,
        },
      ]}
    >
      <View style={styles.row}>
        <Feather name="wifi-off" size={14} color={iconColor} />
        <Text style={[styles.text, { color: textColor }]}>
          {message ?? 'Hors ligne — vos actions seront synchronisées plus tard'}
        </Text>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(240, 176, 48, 0.3)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
