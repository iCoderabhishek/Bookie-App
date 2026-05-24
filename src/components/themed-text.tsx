import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code'
    | 'display'
    | 'marker'
    | 'serif';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        type === 'display' && styles.display,
        type === 'marker' && styles.marker,
        type === 'serif' && styles.serif,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  smallBold: {
    fontFamily: Fonts.sansBold,
    fontSize: 15,
    lineHeight: 22,
  },
  default: {
    fontFamily: Fonts.sans,
    fontSize: 18,
    lineHeight: 26,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 44,
    lineHeight: 48,
  },
  subtitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    lineHeight: 34,
  },
  link: {
    fontFamily: Fonts.sansBold,
    fontSize: 16,
    lineHeight: 24,
  },
  linkPrimary: {
    fontFamily: Fonts.sansBold,
    fontSize: 16,
    lineHeight: 24,
    color: '#3B5CFF',
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    lineHeight: 20,
  },
  display: {
    fontFamily: Fonts.display,
    fontSize: 36,
    lineHeight: 40,
  },
  marker: {
    fontFamily: Fonts.marker,
    fontSize: 18,
    lineHeight: 24,
  },
  serif: {
    fontFamily: Fonts.serif,
    fontSize: 28,
    lineHeight: 34,
  },
});
