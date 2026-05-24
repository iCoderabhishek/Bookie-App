import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  color?: string;
  size?: 'sm' | 'md';
};

export function MarkerTag({ label, color, size = 'md' }: Props) {
  const theme = useTheme();
  const highlight = color ?? theme.backgroundSelected;
  const fontSize = size === 'sm' ? 14 : 16;
  const padH = size === 'sm' ? Spacing.one : Spacing.two;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.highlight,
          {
            backgroundColor: highlight,
            paddingHorizontal: padH,
          },
        ]}
      />
      <ThemedText
        style={[
          styles.text,
          {
            fontFamily: Fonts.marker,
            fontSize,
            color: theme.text,
            paddingHorizontal: padH,
          },
        ]}>
        #{label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 4,
    height: 10,
    transform: [{ rotate: '-1.5deg' }],
  },
  text: {
    includeFontPadding: false,
  },
});
