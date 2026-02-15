import React from 'react';
import { StyleSheet, StatusBar, SafeAreaView, ViewStyle } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Colors } from '../constants/colors';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
};

// Animation definition: slightly slide up + fade in
const fadeInUp = {
  0: { opacity: 0, translateY: 20 },
  1: { opacity: 1, translateY: 0 },
};

export const ScreenWrapper = ({ children, style, delay = 0 }: Props) => {
  return (
    <SafeAreaView style={[styles.container, style]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <Animatable.View 
        animation={fadeInUp} 
        duration={600} 
        delay={delay}
        useNativeDriver 
        style={styles.content}
      >
        {children}
      </Animatable.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
  }
});