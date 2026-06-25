// src/types/streak.ts

/**
 * Représente l'état d'un streak utilisateur.
 * - `current_streak` : nombre de jours consécutifs en cours
 * - `longest_streak` : record personnel
 * - `last_visit_date` : date (YYYY-MM-DD) du dernier jour validé
 * - `last_session_at` : timestamp ISO du dernier moment où la session a atteint 2 min
 * - `total_flames` : total cumulé (stat fun)
 */
export interface UserStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_visit_date: string | null;     // 'YYYY-MM-DD'
  last_session_at: string | null;     // ISO timestamp
  total_flames: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * État dérivé calculé côté client.
 * Sépare la "vérité serveur" de l'UI optimiste.
 */
export interface StreakState {
  /** Nombre de jours de la série en cours (affiché) */
  count: number;
  /** Record personnel */
  best: number;
  /** Total cumulé (toutes époques) */
  total: number;
  /** La flamme est-elle allumée aujourd'hui ? */
  isAliveToday: boolean;
  /** Reste-t-il du temps pour valider la flamme du jour (en secondes) ? */
  secondsUntilQualify: number;
  /** La session courante a-t-elle atteint les 2 minutes ? */
  qualifiedThisSession: boolean;
  /** Erreur éventuelle (réseau, etc.) */
  error: string | null;
  /** Premier chargement en cours */
  loading: boolean;
  /** Palier qui vient d'être franchi (à consommer une fois) */
  newMilestone: import('./badges').Milestone | null;
}

/** Constante partagée : 2 minutes en millisecondes */
export const FLAME_QUALIFY_MS = 2 * 60 * 1000;
