// src/hooks/useStreak.ts
//
// 🎯 Hook principal de la fonctionnalité "Flamme du jour".
//
// Logique :
//  1. On mesure le temps où l'app est effectivement au premier plan
//     (AppState sur mobile, document.visibilityState sur le web).
//  2. Après FLAME_QUALIFY_MS (2 min) → on "qualifie" la session.
//  3. Si la flamme n'est pas encore allumée aujourd'hui, on incrémente le
//     compteur côté Supabase + cache local (AsyncStorage / localStorage).
//  4. Si l'utilisateur a manqué hier ET n'a pas validé aujourd'hui,
//     le compteur est remis à 0 la prochaine fois qu'on calcule l'état.
//
// Tout est multi-plateforme : mobile natif (iOS/Android) et web.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import {
  FLAME_QUALIFY_MS,
  StreakState,
  UserStreak,
} from '../types/streak';
import { MILESTONES, Milestone } from '../types/badges';
import { useAuth } from '../providers/AuthProvider';

const STORAGE_KEY = 'revival_user_streak_v1';

/* --------------------------------------------------------------------------
 * Helpers date (UTC-stable, indépendants du fuseau local)
 * -------------------------------------------------------------------------- */
const toDateKey = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const daysBetween = (aKey: string, bKey: string): number => {
  // Calcule la différence en jours calendaires entre deux clés 'YYYY-MM-DD'.
  const a = new Date(`${aKey}T00:00:00`);
  const b = new Date(`${bKey}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
};

/* --------------------------------------------------------------------------
 * Cache local (AsyncStorage sur mobile, localStorage sur web via polyfill)
 * -------------------------------------------------------------------------- */
const cacheGet = async (): Promise<UserStreak | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserStreak) : null;
  } catch {
    return null;
  }
};

const cacheSet = async (data: UserStreak): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* silencieux */
  }
};

/* --------------------------------------------------------------------------
 * Calcul de l'état dérivé à partir d'un UserStreak brut
 * -------------------------------------------------------------------------- */
function deriveState(streak: UserStreak | null): {
  count: number;
  best: number;
  total: number;
  isAliveToday: boolean;
} {
  if (!streak) {
    return { count: 0, best: 0, total: 0, isAliveToday: false };
  }
  const today = toDateKey();
  const last = streak.last_visit_date;

  let count = streak.current_streak ?? 0;
  let isAliveToday = false;

  if (last === today) {
    isAliveToday = true;
  } else if (last) {
    const diff = daysBetween(last, today);
    if (diff === 1) {
      // Hier validé, aujourd'hui pas encore → on garde la série
      // (count reste intact tant que la validation du jour n'a pas eu lieu)
    } else if (diff > 1) {
      // Plus d'un jour manqué → série cassée
      count = 0;
    }
  } else {
    count = 0;
  }

  return {
    count,
    best: streak.longest_streak ?? 0,
    total: streak.total_flames ?? 0,
    isAliveToday,
  };
}

/* --------------------------------------------------------------------------
 * Hook
 * -------------------------------------------------------------------------- */
export function useStreak() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMilestone, setNewMilestone] = useState<Milestone | null>(null);

  // --- Mesure de session (foreground / onglet visible) --------------------
  const sessionStartRef = useRef<number | null>(null);
  const sessionAccumulatedRef = useRef<number>(0); // ms
  const qualifiedRef = useRef<boolean>(false);
  const lastSyncRef = useRef<string | null>(null); // date du dernier sync
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick 1s pour mettre à jour le compte à rebours dans l'UI
  const [secondsUntilQualify, setSecondsUntilQualify] = useState<number>(
    Math.floor(FLAME_QUALIFY_MS / 1000)
  );
  const [qualifiedThisSession, setQualifiedThisSession] = useState(false);

  /* ---------- Chargement initial ----------------------------------------- */
  useEffect(() => {
    if (!userId) {
      setStreak(null);
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      setLoading(true);
      // 1. Cache d'abord → UI instantanée
      const cached = await cacheGet();
      if (cancelled) return;
      if (cached && cached.user_id === userId) setStreak(cached);

      // 2. Source de vérité
      try {
        const { data, error: err } = await supabase
          .from('user_streaks')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (cancelled) return;
        if (err) {
          setError(err.message);
        } else if (data) {
          setStreak(data as UserStreak);
          await cacheSet(data as UserStreak);
        } else {
          // Pas encore de ligne → on en crée une vide
          const empty: UserStreak = {
            user_id: userId,
            current_streak: 0,
            longest_streak: 0,
            last_visit_date: null,
            last_session_at: null,
            total_flames: 0,
          };
          await supabase.from('user_streaks').upsert(empty);
          setStreak(empty);
          await cacheSet(empty);
        }
      } catch (e: any) {
        setError(e?.message ?? 'unknown');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /* ---------- Validation de la flamme (la fonction clé) ----------------- */
  const validateTodayFlame = useCallback(async () => {
    if (!userId || !streak) return;
    const today = toDateKey();
    if (lastSyncRef.current === today) return; // déjà fait aujourd'hui

    // Calcul du nouveau compteur
    const last = streak.last_visit_date;
    let newCount = streak.current_streak ?? 0;
    let newTotal = streak.total_flames ?? 0;
    let reset = false;

    if (last === today) {
      // déjà validé
      lastSyncRef.current = today;
      return;
    } else if (last && daysBetween(last, today) === 1) {
      // Série continue
      newCount = (streak.current_streak ?? 0) + 1;
      newTotal = (streak.total_flames ?? 0) + 1;
    } else {
      // Première fois OU série cassée → reset
      newCount = 1;
      newTotal = (streak.total_flames ?? 0) + 1;
      reset = true;
    }

    const newBest = Math.max(newCount, streak.longest_streak ?? 0);

    const updated: UserStreak = {
      ...streak,
      current_streak: newCount,
      longest_streak: newBest,
      total_flames: newTotal,
      last_visit_date: today,
      last_session_at: new Date().toISOString(),
    };

    // Optimistic UI
    setStreak(updated);
    await cacheSet(updated);
    lastSyncRef.current = today;

    // Détection d'un palier fraîchement franchi
    const reached = MILESTONES.find(
      (m) => m.days === newCount && (streak.longest_streak ?? 0) < newCount
    );
    if (reached) setNewMilestone(reached);

    // Sync serveur (best effort)
    try {
      const { error: err } = await supabase
        .from('user_streaks')
        .update({
          current_streak: newCount,
          longest_streak: newBest,
          total_flames: newTotal,
          last_visit_date: today,
          last_session_at: updated.last_session_at,
        })
        .eq('user_id', userId);
      if (err) {
        // En cas d'échec, on revert après quelques secondes
        console.warn('[streak] sync failed', err.message);
      }
    } catch (e) {
      console.warn('[streak] sync exception', e);
    }

    if (reset) {
      // Hook pour l'UI : pourrait déclencher une animation "reset"
    }
  }, [streak, userId]);

  /* ---------- Détection foreground / background ------------------------- */
  useEffect(() => {
    if (!userId) return;

    const startSession = () => {
      if (sessionStartRef.current == null) {
        sessionStartRef.current = Date.now();
        qualifiedRef.current = false;
        setQualifiedThisSession(false);
        setSecondsUntilQualify(Math.floor(
          Math.max(0, FLAME_QUALIFY_MS - sessionAccumulatedRef.current) / 1000
        ));
      }
    };

    const endSession = () => {
      if (sessionStartRef.current != null) {
        sessionAccumulatedRef.current += Date.now() - sessionStartRef.current;
        sessionStartRef.current = null;
      }
    };

    // Démarrage initial
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        startSession();
      }
      const onVis = () => {
        if (document.visibilityState === 'visible') startSession();
        else endSession();
      };
      document.addEventListener('visibilitychange', onVis);
      return () => {
        endSession();
        document.removeEventListener('visibilitychange', onVis);
      };
    } else {
      // Mobile natif
      if (AppState.currentState === 'active') startSession();
      const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
        if (s === 'active') startSession();
        else endSession();
      });
      return () => {
        endSession();
        sub.remove();
      };
    }
  }, [userId, validateTodayFlame]);

  /* ---------- Tick 1s : compte à rebours + qualification ---------------- */
  useEffect(() => {
    if (!userId) return;

    const checkQualification = () => {
      if (sessionStartRef.current == null) return;
      const total =
        sessionAccumulatedRef.current +
        (Date.now() - sessionStartRef.current);
      const remainingMs = Math.max(0, FLAME_QUALIFY_MS - total);
      setSecondsUntilQualify(Math.floor(remainingMs / 1000));

      if (!qualifiedRef.current && total >= FLAME_QUALIFY_MS) {
        qualifiedRef.current = true;
        setQualifiedThisSession(true);
        validateTodayFlame();
      }
    };

    tickRef.current = setInterval(checkQualification, 1000);
    // Vérification immédiate au montage (au cas où la session a déjà commencé)
    checkQualification();
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [userId, validateTodayFlame]);

  /* ---------- Quand l'app rouvre après plusieurs jours ----------------- */
  useEffect(() => {
    if (!streak?.last_visit_date) return;
    const today = toDateKey();
    const diff = daysBetween(streak.last_visit_date, today);
    if (diff > 1) {
      // Série cassée → on remet le compteur à 0 localement
      // (la validation du jour recréera une nouvelle série)
      setStreak((s) =>
        s ? { ...s, current_streak: 0 } : s
      );
    }
  }, [streak?.last_visit_date]);

  /* ---------- État exposé ----------------------------------------------- */
  const derived = useMemo(() => deriveState(streak), [streak]);

  const state: StreakState = {
    ...derived,
    secondsUntilQualify,
    qualifiedThisSession,
    error,
    loading,
    newMilestone,
  };

  return {
    ...state,
    dismissMilestone: () => setNewMilestone(null),
  };
}
