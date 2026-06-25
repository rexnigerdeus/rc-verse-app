// src/lib/shareMilestone.ts
//
// Helpers pour partager un milestone (badge de streak).
// - Sur mobile natif → Share API (image + texte).
// - Sur le web → navigator.share si dispo, sinon copie dans le presse-papier.
//
// Le rendu visuel (SVG → PNG) est laissé à l'appelant : ici on génère
// uniquement le texte localisé et on orchestre le partage.

import { Platform, Share } from 'react-native';
import type { Milestone } from '../types/badges';
import i18n from './i18n';

export interface MilestoneShareOptions {
  milestone: Milestone;
  streakDays: number;
  userName?: string;
}

/**
 * Construit le message textuel du partage, localisé en FR/EN selon i18n.
 */
export function buildMilestoneMessage({
  milestone,
  streakDays,
  userName,
}: MilestoneShareOptions): { title: string; message: string } {
  const isFr = (i18n.locale ?? 'fr').startsWith('fr');
  const name = userName ? `, ${userName}` : '';

  if (isFr) {
    return {
      title: `${streakDays} jours de flamme 🔥`,
      message: `${streakDays} jours${name} ! Je viens de débloquer le palier ${milestone.symbol} sur l'appli Revival Culture. La constance transforme. Rejoins-moi !`,
    };
  }
  return {
    title: `${streakDays}-day flame streak 🔥`,
    message: `${streakDays} days${name}! Just unlocked the ${milestone.symbol} milestone on Revival Culture. Consistency transforms. Join me!`,
  };
}

/**
 * Partage un milestone. Cross-platform.
 * Retourne 'shared' | 'copied' | 'failed' selon le résultat.
 */
export async function shareMilestone(
  opts: MilestoneShareOptions
): Promise<'shared' | 'copied' | 'failed'> {
  const { title, message } = buildMilestoneMessage(opts);

  // Web : navigator.share si dispo
  if (Platform.OS === 'web') {
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    if (nav?.share) {
      try {
        await nav.share({ title, text: message });
        return 'shared';
      } catch {
        return 'failed';
      }
    }
    // Fallback web : clipboard
    try {
      await nav?.clipboard?.writeText(message);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  // Mobile natif
  try {
    await Share.share({ title, message });
    return 'shared';
  } catch {
    return 'failed';
  }
}
