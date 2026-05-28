import { type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useVibe } from '@/hooks/use-vibe';
import { withAlpha } from '@/lib/color';

type Props = {
  onPress?: () => void;
  onLongPress?: () => void;
  children: ReactNode;
  background?: string;
  borderColor?: string;
  shadowColor?: string;
  shadowOffset?: number;
  borderWidth?: number;
  radius?: number;
  padding?: number;
  rotate?: number;
  disabled?: boolean;
  style?: ViewStyle;
  hitSlop?: number;
};

export function StickerButton({
  onPress,
  onLongPress,
  children,
  background,
  borderColor,
  shadowColor,
  shadowOffset,
  borderWidth,
  radius,
  padding,
  rotate,
  disabled,
  style,
  hitSlop = 6,
}: Props) {
  const theme = useTheme();
  const vibe = useVibe();

  const rawBg = background ?? theme.backgroundElement;
  const bg = vibe.surfaceOpacity < 1 ? withAlpha(rawBg, vibe.surfaceOpacity) : rawBg;
  const bw = borderWidth ?? vibe.borderWidth;
  const bc = bw > 0 ? (borderColor ?? theme.border) : 'transparent';
  const sc = shadowColor ?? theme.shadow;
  const r = radius ?? vibe.radius;
  const off = shadowOffset ?? vibe.shadowOffset;
  const press = vibe.pressTranslate;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={({ pressed }) => {
        const shadowStyle: ViewStyle =
          pressed && vibe.shadowStyle === 'hard'
            ? {}
            : buildShadow(vibe.shadowStyle, off, sc, vibe);

        return [
          styles.base,
          {
            backgroundColor: bg,
            borderColor: bc,
            borderWidth: bw,
            borderRadius: r,
            padding,
            opacity: disabled ? 0.5 : pressed && vibe.shadowStyle !== 'hard' ? 0.7 : 1,
            transform: [
              { translateX: pressed ? press : 0 },
              { translateY: pressed ? press : 0 },
              ...(rotate ? [{ rotate: `${rotate}deg` }] : []),
            ],
          },
          shadowStyle,
          style,
        ];
      }}>
      <View style={styles.inner}>{children}</View>
    </Pressable>
  );
}

function buildShadow(
  kind: 'hard' | 'soft' | 'none',
  offset: number,
  color: string,
  vibe: { shadowOpacity: number; shadowBlur: number },
): ViewStyle {
  if (kind === 'none') return {};
  if (kind === 'hard') {
    return Platform.select<ViewStyle>({
      web: { boxShadow: `${offset}px ${offset}px 0 0 ${color}` },
      default: {
        shadowColor: color,
        shadowOffset: { width: offset, height: offset },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 0,
      },
    }) ?? {};
  }
  return Platform.select<ViewStyle>({
    web: {
      boxShadow: `0 ${offset}px ${vibe.shadowBlur}px rgba(0,0,0,${vibe.shadowOpacity})`,
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: offset },
      shadowOpacity: vibe.shadowOpacity,
      shadowRadius: vibe.shadowBlur,
      elevation: Math.round(offset),
    },
  }) ?? {};
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
