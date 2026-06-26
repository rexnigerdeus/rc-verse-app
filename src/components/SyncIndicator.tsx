// src/components/SyncIndicator.tsx
//
// Petit indicateur discret dans le coin supérieur qui montre l'état de sync.
// - 'idle' : caché
// - 'syncing' : icône qui tourne + "Synchronisation..."
// - 'error' : icône ambre + "Sync en attente" + nombre pending

import { Feather } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { useTheme } from '../providers/ThemeProvider';

interface SyncIndicatorProps {
  userId: string | null | undefined;
}

export function SyncIndicator({ userId }: SyncIndicatorProps) {
  const { state, pendingCount, flush } = useSyncQueue({ userId });
  const { isDark, colors } = useTheme();

  if (state === 'idle' && pendingCount === 0) return null;

  const isError = state === 'error' || pendingCount > 0;
  const bgColor = isError
    ? isDark ? '#3A2A14' : '#FFF4E0'
    : isDark ? '#1A2E26' : '#E8F5E9';
  const textColor = isError
    ? isDark ? '#F0B030' : '#8B5A1B'
    : isDark ? '#A5D6A7' : '#2E7D32';

  return (
    <MotiView
      from={{ opacity: 0, translateY: -8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 200 }}
    >
      <Pressable
        onPress={flush}
        style={[
          styles.pill,
          {
            backgroundColor: bgColor,
            borderColor: textColor + '40',
          },
        ]}
      >
        <Feather
          name={state === 'syncing' ? 'refresh-cw' : isError ? 'cloud-off' : 'check-circle'}
          size={11}
          color={textColor}
        />
        <Text style={[styles.text, { color: textColor }]}>
          {state === 'syncing'
            ? 'Sync...'
            : pendingCount > 0
              ? `${pendingCount} en attente`
              : 'Sync OK'}
        </Text>
      </Pressable>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 5,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
  },
});
