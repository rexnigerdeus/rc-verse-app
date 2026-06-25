// src/components/StreakModal.tsx
//
// Modale plein écran qui s'ouvre quand l'utilisateur tape sur la flamme.
// Affiche :
//  - Le nombre de jours actuel avec une grosse animation
//  - Le record personnel
//  - Un mini-calendrier des 7 derniers jours
//  - L'état de la session (combien de temps avant que la flamme s'allume)
//  - Un message d'encouragement contextuel
//
// Compatible mobile + web (utilise react-native-modal comme le reste de l'app).

import { Feather } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { SafeModal } from './SafeModal';
import i18n from '../lib/i18n';
import { useTheme } from '../providers/ThemeProvider';
import { FlameIcon } from './FlameIcon';
import { useStreak } from '../hooks/useStreak';

interface StreakModalProps {
  visible: boolean;
  onClose: () => void;
}

const formatSeconds = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const DAY_LABELS_FR = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const DAY_LABELS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function StreakModal({ visible, onClose }: StreakModalProps) {
  const { colors, isDark } = useTheme();
  const {
    count,
    best,
    total,
    isAliveToday,
    secondsUntilQualify,
    qualifiedThisSession,
  } = useStreak();

  const locale = i18n.locale?.startsWith('fr') ? 'fr' : 'en';
  const dayLabels = locale === 'fr' ? DAY_LABELS_FR : DAY_LABELS_EN;

  const weekData = useMemo(() => {
    // 7 jours en arrière → aujourd'hui inclus
    const today = new Date();
    const days: { date: Date; key: string; label: string; active: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${day}`;
      const label = dayLabels[d.getDay()];
      // On marque comme "actif" les N derniers jours selon `count` (si flamme du jour allumée)
      const isToday = i === 0;
      const active = isAliveToday && i < count;
      days.push({ date: d, key, label, active });
    }
    return days;
  }, [count, isAliveToday, dayLabels]);

  // Message d'encouragement contextuel
  const message = useMemo(() => {
    if (isAliveToday) {
      return locale === 'fr'
        ? 'Bravo ! Ta flamme brûle pour aujourd\'hui. Reviens demain pour la garder allumée 🔥'
        : 'Amazing! Your flame is lit for today. Come back tomorrow to keep it burning 🔥';
    }
    if (qualifiedThisSession) {
      return locale === 'fr'
        ? 'Tu as passé 2 min dans l\'app — ta flamme du jour s\'allume !'
        : 'You spent 2 min in the app — your flame lights up for today!';
    }
    if (count === 0) {
      return locale === 'fr'
        ? 'Passe 2 minutes dans l\'app pour allumer ta première flamme.'
        : 'Spend 2 minutes in the app to light your first flame.';
    }
    return locale === 'fr'
      ? `Reste encore ${formatSeconds(secondsUntilQualify)} pour allumer ta flamme du jour.`
      : `Stay ${formatSeconds(secondsUntilQualify)} more to light today's flame.`;
  }, [isAliveToday, qualifiedThisSession, count, secondsUntilQualify, locale]);

  return (
    <SafeModal visible={visible} onClose={onClose} position="bottom">
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Poignée */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>
            {locale === 'fr' ? 'Ta Flamme' : 'Your Flame'}
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Feather name="x" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Bloc central : grande flamme + compteur */}
          <View style={styles.center}>
            <MotiView
              from={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12, delay: 100 }}
            >
              <FlameIcon
                size={120}
                active={isAliveToday}
                intensity={count >= 14 ? 'high' : count >= 3 ? 'mid' : 'low'}
              />
            </MotiView>
            <MotiView
              from={{ translateY: 10, opacity: 0 }}
              animate={{ translateY: 0, opacity: 1 }}
              transition={{ type: 'timing', duration: 500, delay: 250 }}
            >
              <Text style={[styles.bigCount, { color: colors.text }]}>
                {count}
              </Text>
              <Text style={[styles.bigLabel, { color: colors.textSecondary }]}>
                {locale === 'fr'
                  ? count > 1
                    ? 'jours consécutifs'
                    : 'jour de série'
                  : count > 1
                  ? 'days in a row'
                  : 'day streak'}
              </Text>
            </MotiView>
          </View>

          {/* Message contextuel */}
          <View
            style={[
              styles.messageBox,
              {
                backgroundColor: isAliveToday
                  ? isDark
                    ? 'rgba(240, 176, 48, 0.12)'
                    : 'rgba(240, 168, 104, 0.12)'
                  : colors.surfaceBase,
                borderColor: isAliveToday
                  ? isDark
                    ? 'rgba(240, 176, 48, 0.3)'
                    : 'rgba(240, 168, 104, 0.3)'
                  : colors.border,
              },
            ]}
          >
            <Feather
              name={isAliveToday ? 'check-circle' : 'clock'}
              size={16}
              color={isAliveToday ? colors.accent : colors.textSecondary}
            />
            <Text style={[styles.messageText, { color: colors.text }]}>
              {message}
            </Text>
          </View>

          {/* Stats : record + total */}
          <View style={styles.statsRow}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.surfaceBase, borderColor: colors.border },
              ]}
            >
              <Feather name="award" size={18} color={colors.accentWarm} />
              <Text style={[styles.statValue, { color: colors.text }]}>{best}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {locale === 'fr' ? 'Record' : 'Best'}
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.surfaceBase, borderColor: colors.border },
              ]}
            >
              <Feather name="zap" size={18} color={colors.accentSecondary} />
              <Text style={[styles.statValue, { color: colors.text }]}>{total}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {locale === 'fr' ? 'Flammes totales' : 'Total flames'}
              </Text>
            </View>
          </View>

          {/* Calendrier 7 jours */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {locale === 'fr' ? 'Cette semaine' : 'This week'}
          </Text>
          <View style={styles.weekRow}>
            {weekData.map((d, i) => (
              <MotiView
                key={d.key}
                from={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 14, delay: 300 + i * 50 }}
                style={styles.dayCell}
              >
                <View
                  style={[
                    styles.dayDot,
                    {
                      backgroundColor: d.active
                        ? colors.accent
                        : i === 6 && !isAliveToday
                        ? isDark
                          ? 'rgba(240, 176, 48, 0.25)'
                          : 'rgba(240, 168, 104, 0.25)'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.06)'
                        : 'rgba(0, 0, 0, 0.04)',
                      borderColor: d.active ? colors.accent : colors.border,
                    },
                  ]}
                >
                  {d.active && <FlameIcon size={14} active intensity="mid" />}
                </View>
                <Text style={[styles.dayLabel, { color: colors.textTertiary }]}>
                  {d.label}
                </Text>
              </MotiView>
            ))}
          </View>

          {/* Petit tip */}
          <View style={styles.tipRow}>
            <Feather name="info" size={13} color={colors.textTertiary} />
            <Text style={[styles.tipText, { color: colors.textTertiary }]}>
              {locale === 'fr'
                ? '24 h sans venir et ta série repart à zéro. Reviens chaque jour pour rester allumé !'
                : '24 h away and your streak resets. Come back daily to stay on fire!'}
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '90%',
    borderWidth: StyleSheet.hairlineWidth,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Brand_Heading',
    fontSize: 22,
    letterSpacing: -0.4,
  },
  center: {
    alignItems: 'center',
    marginVertical: 20,
  },
  bigCount: {
    fontFamily: 'Brand_Heading',
    fontSize: 56,
    letterSpacing: -2,
    textAlign: 'center',
    marginTop: 8,
  },
  bigLabel: {
    fontFamily: 'Brand_Body',
    fontSize: 14,
    textAlign: 'center',
    marginTop: -4,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 8,
  },
  messageText: {
    flex: 1,
    fontFamily: 'Brand_Body',
    fontSize: 13,
    lineHeight: 19,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: 'Brand_Body_Bold',
    fontSize: 22,
    marginTop: 2,
  },
  statLabel: {
    fontFamily: 'Brand_Body',
    fontSize: 12,
  },
  sectionTitle: {
    fontFamily: 'Brand_Body_Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 10,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCell: {
    alignItems: 'center',
    gap: 6,
  },
  dayDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {
    fontFamily: 'Brand_Body_Bold',
    fontSize: 11,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  tipText: {
    flex: 1,
    fontFamily: 'Brand_Body',
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
  },
});
