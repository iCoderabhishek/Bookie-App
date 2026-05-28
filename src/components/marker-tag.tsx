import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVibe } from '@/hooks/use-vibe';

type Props = {
  label: string;
  color?: string;
  size?: 'sm' | 'md';
};

export function MarkerTag({ label, color, size = 'md' }: Props) {
  const theme = useTheme();
  const vibe = useVibe();
  const highlight = color ?? theme.backgroundSelected;
  const fontSize = size === 'sm' ? 14 : 16;
  const padH = size === 'sm' ? Spacing.one : Spacing.two;

  return (
    <View style={styles.wrap}>
      {vibe.showDecorations ? (
        <View
          style={[
            styles.highlight,
            {
              backgroundColor: highlight,
              paddingHorizontal: padH,
            },
          ]}
        />
      ) : null}
      <ThemedText
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          styles.text,
          {
            fontFamily: vibe.showDecorations ? Fonts.marker : Fonts.sansBold,
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
    maxWidth: '100%',
    paddingVertical: 2,
    flexShrink: 1,
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
