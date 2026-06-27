// src/hooks/useNetworkStatus.ts
//
// Détection de l'état réseau en temps réel.
// - Mobile : NetInfo via expo-network (natif, fiable, gère le basculement WiFi<->4G).
// - Web : navigator.onLine + événements 'online' / 'offline'.
//
// Renvoie aussi `wasOffline` qui passe à `true` dès que l'utilisateur
// a connu une déconnexion (utile pour déclencher une sync).

import * as Network from 'expo-network';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface NetworkStatus {
  isConnected: boolean;
  /** True si l'utilisateur a connu une déconnexion depuis la dernière reconnexion réussie */
  wasOffline: boolean;
}

/**
 * Suit l'état réseau. Renvoie l'état actuel + un flag "a été offline".
 * Polyfill web propre pour expo-network (qui ne marche pas sur navigateur).
 */
export function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const applyState = (online: boolean) => {
      if (cancelled) return;
      setIsConnected(online);
      if (!online) {
        setWasOffline(true);
      }
    };

    if (Platform.OS === 'web') {
      // Web : navigator.onLine + events
      const updateFromNavigator = () => applyState(navigator.onLine);
      updateFromNavigator();

      window.addEventListener('online', updateFromNavigator);
      window.addEventListener('offline', updateFromNavigator);

      return () => {
        cancelled = true;
        window.removeEventListener('online', updateFromNavigator);
        window.removeEventListener('offline', updateFromNavigator);
      };
    }

    // Mobile : expo-network
    const checkInitial = async () => {
      try {
        // Garde-fou : si expo-network n'est pas disponible (rare crash natif),
        // on reste sur l'état par défaut (online).
        if (typeof Network?.getNetworkStateAsync !== 'function') {
          applyState(true);
          return;
        }
        const state = await Network.getNetworkStateAsync();
        applyState(!!state?.isConnected && state?.isInternetReachable !== false);
      } catch (e) {
        // On ne crash JAMAIS l'app si expo-network plante
        console.warn('[useNetworkStatus] getNetworkStateAsync failed', e);
        applyState(true);
      }
    };
    checkInitial();

    // Poll toutes les 30s — moins fréquent que 10s pour réduire le risque de
    // conflit avec d'autres listeners natifs sur iOS.
    const interval = setInterval(checkInitial, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { isConnected, wasOffline };
}
