// src/components/ErrorBoundary.tsx
//
// Error Boundary global : capture les crashes React, les logge,
// et affiche une UI de fallback gracieuse au lieu d'un crash natif.
// ATTENTION : il ne capture PAS les crashs natifs (ex: SQLite qui plante
// en dehors de React). Pour ça il faut le couple avec Sentry / Firebase Crashlytics.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { FlameIcon } from './FlameIcon';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log pour debug. En prod, brancher Sentry ici.
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorScreen error={this.state.error} onReload={this.handleReload} />;
    }
    return this.props.children;
  }
}

function ErrorScreen({ error, onReload }: { error: Error | null; onReload: () => void }) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.primary,
          paddingTop: 60,
        },
      ]}
    >
      <FlameIcon size={80} active={false} />
      <Text style={[styles.title, { color: colors.text }]}>
        Oups, quelque chose s'est mal passé
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        L'application a rencontré une erreur inattendue. Tu peux réessayer.
      </Text>
      {__DEV__ && error && (
        <View style={[styles.errorBox, { backgroundColor: colors.surfaceBase, borderColor: colors.border }]}>
          <Text style={[styles.errorText, { color: colors.error }]} numberOfLines={5}>
            {error.message}
          </Text>
        </View>
      )}
      <Pressable
        style={[styles.button, { backgroundColor: colors.ctaFill }]}
        onPress={onReload}
      >
        <Text style={[styles.buttonText, { color: colors.ctaText }]}>Réessayer</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 32,
    gap: 16,
  },
  title: {
    fontFamily: 'Brand_Heading',
    fontSize: 22,
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontFamily: 'Brand_Body',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    marginTop: 12,
  },
  errorText: {
    fontFamily: 'Brand_Body',
    fontSize: 12,
  },
  button: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  buttonText: {
    fontFamily: 'Brand_Body_Bold',
    fontSize: 15,
  },
});