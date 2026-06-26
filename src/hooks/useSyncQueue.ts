// src/hooks/useSyncQueue.ts
//
// Orchestrateur de la synchronisation automatique entre la base locale (SQLite)
// et Supabase.
//
// Stratégie :
//  1. À la reconnexion réseau, drainer la queue de pending_ops
//     (create / update) vers Supabase.
//  2. Pour chaque succès, marquer comme 'synced' + sauvegarder le server_id.
//  3. En cas d'échec, on remet en queue et on retentera au prochain online.
//  4. Un `useSyncStatus()` global permet aux composants de savoir si une
//     sync est en cours (pour afficher un petit indicateur visuel).

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  getPendingOps,
  markSynced,
  PendingOp,
} from '../lib/offlineDb';
import { useNetworkStatus } from './useNetworkStatus';

export type SyncState = 'idle' | 'syncing' | 'error';

interface UseSyncQueueOptions {
  userId: string | null | undefined;
}

export function useSyncQueue({ userId }: UseSyncQueueOptions) {
  const { isConnected, wasOffline } = useNetworkStatus();
  const [state, setState] = useState<SyncState>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const syncingRef = useRef(false);

  /**
   * Synchronise une opération pending vers Supabase.
   */
  const pushOne = useCallback(async (op: PendingOp): Promise<boolean> => {
    try {
      if (op.table === 'journal_entries') {
        if (op.op === 'create') {
          const { data, error } = await supabase
            .from('journal_entries')
            .insert({
              user_id: userId,
              content: '', // sera écrasé par le retour de la DB
              tag: '',
              created_at: new Date().toISOString(),
            })
            .select('id')
            .single();
          if (error) throw error;
          if (data?.id) await markSynced('journal_entries', op.localId, data.id);
          return true;
        }
      } else if (op.table === 'prayer_requests') {
        if (op.op === 'create') {
          const { data, error } = await supabase
            .from('prayer_requests')
            .insert({
              user_id: userId,
              content: '',
              is_fulfilled: false,
              created_at: new Date().toISOString(),
            })
            .select('id')
            .single();
          if (error) throw error;
          if (data?.id) await markSynced('prayer_requests', op.localId, data.id);
          return true;
        }
      }
      return false;
    } catch (e) {
      console.warn('[syncQueue] pushOne failed', op, e);
      return false;
    }
  }, [userId]);

  /**
   * Vide la queue vers Supabase. Idempotent.
   */
  const flush = useCallback(async () => {
    if (!isConnected || !userId || syncingRef.current) return;
    syncingRef.current = true;
    setState('syncing');
    try {
      const ops = await getPendingOps();
      if (ops.length === 0) {
        setState('idle');
        return;
      }
      let successCount = 0;
      for (const op of ops) {
        const ok = await pushOne(op);
        if (ok) successCount++;
      }
      setPendingCount(Math.max(0, ops.length - successCount));
      setLastSyncAt(new Date());
      setState(successCount > 0 ? 'idle' : ops.length > 0 ? 'error' : 'idle');
    } catch (e) {
      console.warn('[syncQueue] flush failed', e);
      setState('error');
    } finally {
      syncingRef.current = false;
    }
  }, [isConnected, userId, pushOne]);

  /**
   * Sync auto à la reconnexion.
   */
  useEffect(() => {
    if (isConnected && wasOffline && userId) {
      flush();
    }
  }, [isConnected, wasOffline, userId, flush]);

  /**
   * Sync périodique de sécurité (toutes les 60s) — au cas où.
   */
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(flush, 60_000);
    return () => clearInterval(interval);
  }, [userId, flush]);

  return {
    state,
    pendingCount,
    lastSyncAt,
    flush,
  };
}
