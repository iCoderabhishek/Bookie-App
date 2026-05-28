import { forwardRef, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useVibe } from '@/hooks/use-vibe';
import { withAlpha } from '@/lib/color';

type StickerProps = ViewProps & {
  children?: ReactNode;
  background?: string;
  borderColor?: string;
  shadowColor?: string;
  shadowOffset?: number;
  borderWidth?: number;
  radius?: number;
  rotate?: number;
  flat?: boolean;
};

export const Sticker = forwardRef<View, StickerProps>(function Sticker(
  {
    children,
    background,
    borderColor,
    shadowColor,
    shadowOffset,
    borderWidth,
    radius,
    rotate,
    flat = false,
    style,
    ...rest
  },
  ref,
) {
  const theme = useTheme();
  const vibe = useVibe();

  const rawBg = background ?? theme.backgroundElement;
  const bg = vibe.surfaceOpacity < 1 ? withAlpha(rawBg, vibe.surfaceOpacity) : rawBg;
  const bw = borderWidth ?? vibe.borderWidth;
  const bc = bw > 0 ? (borderColor ?? theme.border) : 'transparent';
  const sc = shadowColor ?? theme.shadow;
  const r = radius ?? vibe.radius;
  const off = shadowOffset ?? vibe.shadowOffset;

  const shadowStyle = flat ? {} : buildShadow(vibe.shadowStyle, off, sc, vibe);

  return (
    <View
      ref={ref}
      style={[
        styles.base,
        {
          backgroundColor: bg,
          borderColor: bc,
          borderWidth: bw,
          borderRadius: r,
        },
        shadowStyle,
        rotate ? { transform: [{ rotate: `${rotate}deg` }] } : null,
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
});

function buildShadow(
  kind: 'hard' | 'soft' | 'none',
  offset: number,
  color: string,
  vibe: { shadowOpacity: number; shadowBlur: number },
): ViewStyle {
  if (kind === 'none') return {};
  if (kind === 'hard') {
    return Platform.select<ViewStyle>({
      web: {
        boxShadow: `${offset}px ${offset}px 0 0 ${color}`,
      },
      default: {
        shadowColor: color,
        shadowOffset: { width: offset, height: offset },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 0,
      },
    }) ?? {};
  }
  // soft (glass / clay)
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
    backgroundColor: 'transparent',
  },
});
