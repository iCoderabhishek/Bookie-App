import { forwardRef, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { Borders, Radius, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
    shadowOffset = Shadows.hard.offset,
    borderWidth = Borders.thick,
    radius = Radius.md,
    rotate,
    flat = false,
    style,
    ...rest
  },
  ref,
) {
  const theme = useTheme();
  const bg = background ?? theme.backgroundElement;
  const bc = borderColor ?? theme.border;
  const sc = shadowColor ?? theme.shadow;

  const shadowStyle: ViewStyle = flat
    ? {}
    : Platform.select<ViewStyle>({
        web: {
          boxShadow: `${shadowOffset}px ${shadowOffset}px 0 0 ${sc}`,
        },
        default: {
          shadowColor: sc,
          shadowOffset: { width: shadowOffset, height: shadowOffset },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 0,
        },
      }) ?? {};

  return (
    <View
      ref={ref}
      style={[
        styles.base,
        {
          backgroundColor: bg,
          borderColor: bc,
          borderWidth,
          borderRadius: radius,
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

const styles = StyleSheet.create({
  base: {
    backgroundColor: 'transparent',
  },
});
