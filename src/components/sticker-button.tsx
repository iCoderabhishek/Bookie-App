import { type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Borders, Radius, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
  shadowOffset = Shadows.hard.offset,
  borderWidth = Borders.thick,
  radius = Radius.md,
  padding,
  rotate,
  disabled,
  style,
  hitSlop = 6,
}: Props) {
  const theme = useTheme();
  const bg = background ?? theme.backgroundElement;
  const bc = borderColor ?? theme.border;
  const sc = shadowColor ?? theme.shadow;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={({ pressed }) => {
        const shadowStyle: ViewStyle = pressed
          ? {}
          : Platform.select<ViewStyle>({
              web: { boxShadow: `${shadowOffset}px ${shadowOffset}px 0 0 ${sc}` },
              default: {
                shadowColor: sc,
                shadowOffset: { width: shadowOffset, height: shadowOffset },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 0,
              },
            }) ?? {};

        return [
          styles.base,
          {
            backgroundColor: bg,
            borderColor: bc,
            borderWidth,
            borderRadius: radius,
            padding,
            opacity: disabled ? 0.5 : 1,
            transform: [
              { translateX: pressed ? shadowOffset : 0 },
              { translateY: pressed ? shadowOffset : 0 },
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
