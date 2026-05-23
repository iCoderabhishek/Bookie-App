import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { Sentry } from '@/lib/sentry';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    const theme = Colors.light;
    return (
      <ThemedView style={styles.flex}>
        <SafeAreaView style={[styles.flex, styles.center]}>
          <View style={styles.box}>
            <ThemedText style={styles.emoji}>😵‍💫</ThemedText>
            <ThemedText style={[styles.title, { fontFamily: Fonts.rounded }]}>
              something cracked
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.body}>
              The error has been logged. Try again, and if it keeps happening, restart the app.
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.detail}
              numberOfLines={3}>
              {this.state.error.message}
            </ThemedText>
            <Pressable
              onPress={this.reset}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: theme.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <ThemedText
                style={[styles.ctaText, { color: theme.textOnPrimary, fontFamily: Fonts.rounded }]}>
                try again
              </ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  box: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    alignItems: 'center',
    maxWidth: 360,
  },
  emoji: { fontSize: 56, marginBottom: Spacing.two },
  title: { fontSize: 26, fontWeight: '800' },
  body: { textAlign: 'center' },
  detail: { textAlign: 'center', marginTop: Spacing.two, opacity: 0.6 },
  cta: {
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
  },
  ctaText: { fontSize: 16, fontWeight: '800' },
});
