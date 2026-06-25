// src/components/BadgeIcon.tsx
//
// Composant Badge : cercle avec halo coloré + symbole.
// Variante "static" pour les grilles, "pulse" pour la mise en valeur.

import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Milestone } from '../types/badges';

interface BadgeIconProps {
  milestone: Milestone;
  size?: number;
  reached?: boolean;
  pulse?: boolean;
}

export function BadgeIcon({
  milestone,
  size = 56,
  reached = true,
  pulse = false,
}: BadgeIconProps) {
  const innerSize = size * 0.78;
  const opacity = reached ? 1 : 0.25;

  const container = (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: reached ? milestone.bgColor : 'rgba(0,0,0,0.04)',
          borderColor: reached ? milestone.color : 'rgba(0,0,0,0.08)',
          opacity,
        },
      ]}
    >
      <Text style={[styles.symbol, { fontSize: innerSize * 0.55 }]}>
        {milestone.symbol}
      </Text>
    </View>
  );

  if (pulse && reached) {
    return (
      <MotiView
        from={{ scale: 1 }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ type: 'timing', duration: 1600, loop: true }}
      >
        {container}
      </MotiView>
    );
  }

  return container;
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  symbol: {
    textAlign: 'center',
  },
});
