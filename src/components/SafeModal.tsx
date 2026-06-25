// src/components/SafeModal.tsx
//
// Drop-in replacement for `react-native-modal` qui contourne le warning
// React 19 "Accessing element.ref was removed".
//
// On s'appuie sur le `Modal` natif de React Native + un overlay calculé
// manuellement. C'est volontairement minimaliste : on couvre les cas
// d'usage de l'app (bottom-sheet plein écran, fade, swipe-to-close).

import React, { useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal as RNModal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface SafeModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Position du contenu. Par défaut : 'bottom' (bottom-sheet) */
  position?: 'bottom' | 'center';
  /** Autoriser swipe-down pour fermer (bottom uniquement) */
  swipeToClose?: boolean;
  /** Permettre au backdrop de fermer */
  backdropDismissible?: boolean;
  /** Style appliqué au conteneur du contenu */
  contentStyle?: ViewStyle;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function SafeModal({
  visible,
  onClose,
  children,
  position = 'bottom',
  swipeToClose = false,
  backdropDismissible = true,
  contentStyle,
}: SafeModalProps) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);

  // Animation
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(position === 'bottom' ? SCREEN_HEIGHT : 0)).current;
  const scale = React.useRef(new Animated.Value(position === 'center' ? 0.94 : 1)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        position === 'bottom'
          ? Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 })
          : Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 220 }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        position === 'bottom'
          ? Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true })
          : Animated.timing(scale, { toValue: 0.94, duration: 180, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  const isCenter = position === 'center';

  return (
    <RNModal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
            onPress={backdropDismissible ? onClose : undefined}
          />
        </Animated.View>

        {/* Content */}
        <Animated.View
          style={[
            isCenter ? styles.centerWrap : styles.bottomWrap,
            isCenter
              ? { opacity, transform: [{ scale }] }
              : { transform: [{ translateY }] },
            !isCenter && { paddingBottom: insets.bottom },
            contentStyle,
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bottomWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SCREEN_HEIGHT * 0.92,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
