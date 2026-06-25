// src/components/FlameBadge.tsx
//
// Pill compact affichant la flamme + le nombre de jours.
// Conçu pour le header de la home. Tap → ouvre la modale de détails.

import { MotiView } from 'moti';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import i18n from '../lib/i18n';
import { useTheme } from '../providers/ThemeProvider';
import { FlameIcon, FlameIconStatic } from './FlameIcon';
import { useStreak } from '../hooks/useStreak';

interface FlameBadgeProps {
  onPress?: () => void;
}

export function FlameBadge({ onPress }: FlameBadgeProps) {
  const { colors, isDark } = useTheme();
  const { count, isAliveToday, loading } = useStreak();

  const intensity = useMemo<'low' | 'mid' | 'high'>(() => {
    if (count >= 14) return 'high';
    if (count >= 3) return 'mid';
    return 'low';
  }, [count]);

  if (loading) return null;
  if (count === 0) {
    // Premier jour : on montre quand même la flamme (en gris) pour inciter
    return (
      <Pressable onPress={onPress} style={{ marginRight: 4 }}>
        <FlameIconStatic size={22} active={false} />
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <MotiView
        from={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 14 }}
        style={[
          styles.pill,
          {
            backgroundColor: isDark
              ? 'rgba(240, 176, 48, 0.15)'
              : 'rgba(240, 168, 104, 0.15)',
            borderColor: isDark
              ? 'rgba(240, 176, 48, 0.4)'
              : 'rgba(240, 168, 104, 0.4)',
          },
        ]}
      >
        {isAliveToday ? (
          <FlameIcon size={20} active intensity={intensity} />
        ) : (
          <FlameIconStatic size={20} active={false} />
        )}
        <Text
          style={[
            styles.count,
            { color: colors.text },
          ]}
        >
          {count}
        </Text>
        {isAliveToday && (
          <View
            style={[
              styles.pulse,
              { backgroundColor: colors.accent },
            ]}
          />
        )}
      </MotiView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  count: {
    fontFamily: 'Brand_Body_Bold',
    fontSize: 14,
    letterSpacing: -0.3,
  },
  pulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 2,
  },
});
