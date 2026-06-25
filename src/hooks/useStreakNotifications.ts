// src/hooks/useStreakNotifications.ts
//
// Programme une notification locale "Ta flamme s'éteint dans X heures"
// quand l'utilisateur n'a pas encore validé sa flamme du jour ET qu'il est
// tard dans la journée (typiquement après 20h locale).
//
// Stratégie :
//  1. Si la flamme est déjà allumée → on annule tout.
//  2. Sinon on calcule un créneau dans la soirée (ex: 22h) pour rappeler
//     que la flamme expire à minuit.
//  3. Idempotent : reprogrammer plusieurs fois dans la même journée
//     n'accumule pas de notifs (on nettoie avant de planifier).
//
// Limites :
//  - Sur le web, expo-notifications n'est pas supporté → no-op.
//  - On n'envoie pas la notif si la série est déjà à 0 (premier jour,
//    on ne sait pas si l'utilisateur a déjà vu la notif "bienvenue").

import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import i18n from '../lib/i18n';
import { useStreak } from './useStreak';

const STREAK_NOTIFICATION_ID = 'streak-reminder-evening';

export function useStreakNotifications() {
  const { count, isAliveToday, qualifiedThisSession } = useStreak();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    // Pas de notif pour un utilisateur qui n'a pas encore commencé
    if (count === 0) return;

    let cancelled = false;

    const schedule = async () => {
      try {
        // Si la flamme brûle → on annule la notif
        if (isAliveToday || qualifiedThisSession) {
          await Notifications.cancelScheduledNotificationAsync(STREAK_NOTIFICATION_ID);
          return;
        }

        // Sinon → on programme pour ce soir 22h
        const now = new Date();
        const trigger = new Date();
        trigger.setHours(22, 0, 0, 0);

        // Si on est déjà passé 22h, on programme pour 23h30
        if (now.getTime() >= trigger.getTime()) {
          trigger.setHours(23, 30, 0, 0);
        }
        // Si on est déjà après 23h30, pas de notif ce soir (trop tard)
        if (now.getTime() >= trigger.getTime()) return;

        // Annule l'éventuelle notif précédente pour rester idempotent
        await Notifications.cancelScheduledNotificationAsync(STREAK_NOTIFICATION_ID);

        if (cancelled) return;

        const locale = (i18n.locale ?? 'fr').startsWith('fr') ? 'fr' : 'en';
        const title =
          locale === 'fr'
            ? '🔥 Ta flamme s\'éteint ce soir !'
            : '🔥 Your flame goes out tonight!';
        const body =
          locale === 'fr'
            ? `Ta série de ${count} jour${count > 1 ? 's' : ''} s'arrête à minuit. 2 min dans l'app suffisent pour la garder allumée.`
            : `Your ${count}-day streak ends at midnight. Just 2 minutes in the app keeps it alive.`;

        await Notifications.scheduleNotificationAsync({
          identifier: STREAK_NOTIFICATION_ID,
          content: { title, body, sound: true },
          trigger: {
            type: SchedulableTriggerInputTypes.DATE,
            date: trigger,
          },
        });
      } catch (e) {
        // silencieux : pas grave si on n'arrive pas à planifier
        console.warn('[streak notifications]', e);
      }
    };

    schedule();
    return () => {
      cancelled = true;
    };
  }, [count, isAliveToday, qualifiedThisSession]);
}
