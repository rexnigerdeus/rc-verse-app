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
        const state = await Network.getNetworkStateAsync();
        applyState(!!state.isConnected && state.isInternetReachable !== false);
      } catch {
        applyState(true); // En cas d'erreur API, on suppose online
      }
    };
    checkInitial();

    // Poll toutes les 10s — expo-network n'expose pas de subscription,
    // mais c'est léger et suffisant pour la fiabilité offline.
    const interval = setInterval(checkInitial, 10_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { isConnected, wasOffline };
}
