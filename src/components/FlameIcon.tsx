// src/components/FlameIcon.tsx
//
// 🔥 Icône flamme SVG animée (compatible mobile + web).
// Utilise react-native-svg + moti pour les animations.
// Couleurs : dégradé pêche→or (cohérent avec la palette de l'app).

import { MotiView } from 'moti';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { useTheme } from '../providers/ThemeProvider';

interface FlameIconProps {
  size?: number;
  /** true = allumée (animée), false = éteinte (grise) */
  active?: boolean;
  /** Variation de teinte en fonction de la série (jours) */
  intensity?: 'low' | 'mid' | 'high';
}

export function FlameIcon({ size = 28, active = true, intensity = 'mid' }: FlameIconProps) {
  const { colors, isDark } = useTheme();

  // Couleurs
  const flameTop = active
    ? intensity === 'high'
      ? '#FFD66B'
      : intensity === 'mid'
      ? '#F0B030' // accent (or)
      : '#F0A868' // accentWarm (pêche)
    : colors.textTertiary;
  const flameBottom = active
    ? intensity === 'high'
      ? '#F0A060'
      : '#E8451F' // error (rouge flamme)
    : colors.border;
  const flameInner = active ? '#FFE9A8' : colors.border;

  // Halo derrière la flamme (visible si active)
  const haloOpacity = active ? 0.35 : 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Halo pulsant */}
      {active && (
        <MotiView
          from={{ scale: 0.7, opacity: 0.2 }}
          animate={{ scale: 1.15, opacity: 0.45 }}
          transition={{
            type: 'timing',
            duration: 1400,
            loop: true,
            repeatReverse: true,
          }}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.accentWarm,
            opacity: haloOpacity,
          }}
        />
      )}

      {/* Corps de la flamme (animation de respiration) */}
      <MotiView
        from={{ scale: 1, translateY: 0 }}
        animate={{
          scale: active ? [1, 1.06, 0.98, 1] : 1,
          translateY: active ? [0, -1, 1, 0] : 0,
        }}
        transition={{
          type: 'timing',
          duration: 1800,
          loop: true,
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Defs>
            <LinearGradient id="flameOuter" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={flameBottom} />
              <Stop offset="0.6" stopColor={flameTop} />
              <Stop offset="1" stopColor={flameTop} stopOpacity="0.8" />
            </LinearGradient>
            <RadialGradient id="flameInner" cx="0.5" cy="0.7" r="0.5">
              <Stop offset="0" stopColor={flameInner} stopOpacity="0.95" />
              <Stop offset="1" stopColor={flameInner} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Flamme extérieure */}
          <Path
            d="M32 4
               C 36 14, 48 18, 48 32
               C 48 44, 40 54, 32 56
               C 24 54, 16 44, 16 32
               C 16 22, 24 20, 28 12
               C 30 8, 31 6, 32 4 Z"
            fill="url(#flameOuter)"
          />
          {/* Flamme intérieure (plus claire) */}
          <Path
            d="M32 18
               C 35 24, 41 26, 41 35
               C 41 43, 36 49, 32 50
               C 28 49, 23 43, 23 35
               C 23 28, 28 26, 30 22
               C 31 20, 31.5 19, 32 18 Z"
            fill="url(#flameInner)"
          />
          {/* Base plus chaude */}
          <Ellipse cx="32" cy="50" rx="9" ry="5" fill={flameBottom} opacity="0.4" />
        </Svg>
      </MotiView>
    </View>
  );
}

/**
 * Variante "tiny" pour intégration dans des espaces restreints (tab badge, etc.).
 * Désactive les animations pour réduire le coût visuel.
 */
export function FlameIconStatic({
  size = 16,
  active = true,
}: Pick<FlameIconProps, 'size' | 'active'>) {
  const { colors } = useTheme();
  const top = active ? colors.accent : colors.textTertiary;
  const bottom = active ? colors.error : colors.border;

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="staticFlame" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={bottom} />
          <Stop offset="1" stopColor={top} />
        </LinearGradient>
      </Defs>
      <Path
        d="M32 4
           C 36 14, 48 18, 48 32
           C 48 44, 40 54, 32 56
           C 24 54, 16 44, 16 32
           C 16 22, 24 20, 28 12
           C 30 8, 31 6, 32 4 Z"
        fill="url(#staticFlame)"
      />
    </Svg>
  );
}
