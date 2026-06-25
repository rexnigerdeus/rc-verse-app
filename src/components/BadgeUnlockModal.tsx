// src/components/BadgeUnlockModal.tsx
//
// Modale plein écran qui apparaît quand l'utilisateur débloque un palier.
// Animation spectaculaire : particules + zoom + confettis emoji.
// Cross-platform (mobile + web) via SafeModal.

import { Feather } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeModal } from './SafeModal';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { shareMilestone } from '../lib/shareMilestone';
import type { Milestone } from '../types/badges';

interface BadgeUnlockModalProps {
  milestone: Milestone | null;
  onClose: () => void;
}

const CONFETTI_SYMBOLS = ['✨', '⭐', '🌟', '🔥', '💫', '🎉', '🕊️', '🌈'];

/**
 * Confettis dispersés sur l'écran (positions et délais aléatoires).
 * Régénérés à chaque ouverture de la modale.
 */
function useConfetti(count = 14) {
  const [confetti, setConfetti] = React.useState<
    Array<{ id: number; symbol: string; left: number; delay: number; duration: number }>
  >([]);
  useEffect(() => {
    setConfetti(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        symbol: CONFETTI_SYMBOLS[Math.floor(Math.random() * CONFETTI_SYMBOLS.length)],
        left: Math.random() * 100,
        delay: Math.random() * 600,
        duration: 1800 + Math.random() * 1200,
      }))
    );
  }, [count]);
  return confetti;
}

export function BadgeUnlockModal({ milestone, onClose }: BadgeUnlockModalProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [sharing, setSharing] = useState(false);
  const confetti = useConfetti();

  if (!milestone) return null;

  const userName =
    (user?.user_metadata?.first_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const result = await shareMilestone({
        milestone,
        streakDays: milestone.days,
        userName,
      });
      if (result === 'copied') {
        Alert.alert('Copié !', 'Le message a été copié dans le presse-papier.');
      }
    } catch (e) {
      // silencieux
    } finally {
      setSharing(false);
    }
  };

  return (
    <SafeModal visible={!!milestone} onClose={onClose} position="center">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        {/* Confettis */}
        {confetti.map((c) => (
          <MotiView
            key={c.id}
            from={{ translateY: -40, opacity: 0, rotate: '0deg' }}
            animate={{ translateY: 600, opacity: [0, 1, 1, 0], rotate: '720deg' }}
            transition={{
              type: 'timing',
              duration: c.duration,
              delay: c.delay,
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: `${c.left}%`,
            }}
          >
            <Text style={{ fontSize: 28 }}>{c.symbol}</Text>
          </MotiView>
        ))}

        {/* Carte centrale */}
        <View style={styles.center}>
          <MotiView
            from={{ scale: 0, rotate: '-180deg', opacity: 0 }}
            animate={{ scale: 1, rotate: '0deg', opacity: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 140 }}
            style={[
              styles.badgeOuter,
              {
                backgroundColor: milestone.bgColor,
                borderColor: milestone.color,
              },
            ]}
          >
            <MotiView
              from={{ scale: 1 }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ type: 'timing', duration: 1200, loop: true }}
            >
              <Text style={styles.symbol}>{milestone.symbol}</Text>
            </MotiView>
          </MotiView>

          <MotiView
            from={{ translateY: 16, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            transition={{ type: 'timing', duration: 500, delay: 350 }}
          >
            <Text style={[styles.kicker, { color: milestone.color }]}>
              PALIER DÉBLOQUÉ
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              {milestone.days} jours de flamme 🔥
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Tu fais maintenant partie de l'élite. Continue, le prochain palier t'attend !
            </Text>
          </MotiView>

          <MotiView
            from={{ translateY: 10, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            transition={{ type: 'timing', duration: 400, delay: 600 }}
            style={styles.actions}
          >
            <View style={styles.actionsRow}>
              <Pressable
                onPress={handleShare}
                disabled={sharing}
                style={[
                  styles.shareButton,
                  { borderColor: milestone.color },
                  sharing && { opacity: 0.6 },
                ]}
              >
                <Feather name="share-2" size={16} color={milestone.color} />
                <Text style={[styles.shareText, { color: milestone.color }]}>
                  Partager
                </Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                style={[styles.button, { backgroundColor: milestone.color }]}
              >
                <Text style={[styles.buttonText, { color: colors.ctaText }]}>
                  Continuer
                </Text>
                <Feather name="arrow-right" size={16} color={colors.ctaText} />
              </Pressable>
            </View>
          </MotiView>
        </View>
      </Pressable>
    </SafeModal>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  badgeOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  symbol: { fontSize: 90, textAlign: 'center' },
  kicker: {
    fontFamily: 'Brand_Body_Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Brand_Heading',
    fontSize: 28,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Brand_Body',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  actions: { marginTop: 12 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: 'transparent',
    gap: 8,
  },
  shareText: { fontFamily: 'Brand_Body_Bold', fontSize: 15 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
    gap: 8,
  },
  buttonText: {
    fontFamily: 'Brand_Body_Bold',
    fontSize: 15,
  },
});
