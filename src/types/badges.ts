// src/types/badges.ts
//
// Système de badges / niveaux basé sur la série de flammes.
// Chaque palier débloque un badge visible dans le profil et la StreakModal.

import { useTheme } from '../providers/ThemeProvider';

export interface Milestone {
  /** Jours de streak requis pour débloquer */
  days: number;
  /** Identifiant court (utilisé dans le code et l'i18n) */
  id: string;
  /** Symbole (emoji court, compatible partout) */
  symbol: string;
  /** Couleur d'accent pour le badge */
  color: string;
  /** Couleur de fond (très transparente) pour le halo */
  bgColor: string;
}

/**
 * Catalogue des paliers, dans l'ordre croissant.
 * Ordre important : on s'arrête au premier palier dont days > streak courant.
 */
export const MILESTONES: Milestone[] = [
  { days: 3,  id: 'spark',  symbol: '✨', color: '#F0A868', bgColor: 'rgba(240, 168, 104, 0.15)' },
  { days: 7,  id: 'week',   symbol: '🔥', color: '#F0B030', bgColor: 'rgba(240, 176, 48, 0.18)' },
  { days: 14, id: 'fortnight', symbol: '⚡', color: '#9B7EBD', bgColor: 'rgba(155, 126, 189, 0.18)' },
  { days: 30, id: 'month',  symbol: '🌟', color: '#E8A818', bgColor: 'rgba(232, 168, 24, 0.20)' },
  { days: 50, id: 'warrior', symbol: '🛡️', color: '#E8451F', bgColor: 'rgba(232, 69, 31, 0.18)' },
  { days: 100, id: 'century', symbol: '👑', color: '#9B7EBD', bgColor: 'rgba(155, 126, 189, 0.25)' },
  { days: 365, id: 'year',  symbol: '🌈', color: '#F0A868', bgColor: 'rgba(240, 168, 104, 0.25)' },
];

/**
 * Détermine le palier atteint pour une série donnée.
 * Renvoie le palier le plus élevé dont days <= streak.
 */
export function getCurrentMilestone(streak: number): Milestone | null {
  let current: Milestone | null = null;
  for (const m of MILESTONES) {
    if (streak >= m.days) current = m;
    else break;
  }
  return current;
}

/**
 * Prochain palier à atteindre.
 */
export function getNextMilestone(streak: number): Milestone | null {
  for (const m of MILESTONES) {
    if (streak < m.days) return m;
  }
  return null; // streak ≥ 365 → tous les paliers sont atteints
}

/**
 * Jours restants avant le prochain palier (0 si au max).
 */
export function getDaysToNextMilestone(streak: number): number {
  const next = getNextMilestone(streak);
  if (!next) return 0;
  return Math.max(0, next.days - streak);
}

/**
 * Liste tous les paliers avec leur état (atteint ou non).
 * Utile pour afficher la grille de badges dans le profil.
 */
export function getMilestoneStatus(streak: number): Array<Milestone & { reached: boolean }> {
  return MILESTONES.map((m) => ({ ...m, reached: streak >= m.days }));
}
