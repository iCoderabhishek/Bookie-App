import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVibe, useVibeKey } from '@/hooks/use-vibe';

type Props = {
  /** Bookmark mark width in px. Wordmark scales relative. */
  size?: number;
  /** Show the "BOOKIE" wordmark next to the mark. */
  showWordmark?: boolean;
  style?: ViewStyle;
};

/**
 * Brand mark + wordmark. The mark is a stylized bookmark with a "B"
 * inside — the shape itself is the brand metaphor (Bookie = bookmarks).
 * Form adapts to the current vibe; color adapts to the current palette.
 */
export function BookieLogo({ size = 36, showWordmark = true, style }: Props) {
  const theme = useTheme();
  const vibe = useVibe();
  const vibeKey = useVibeKey();

  const w = size;
  const h = Math.round(size * 1.42);
  // Top corner radius: vibe-aware but clamped so a Clay bookmark doesn't become a pill.
  const r = Math.min(vibe.radiusSmall, Math.round(w * 0.25));
  const notch = Math.round(h * 0.22);
  const stroke = vibe.borderWidth;

  const path = bookmarkPath(w, h, r, notch);

  const shadowOffset = vibe.shadowStyle === 'hard' ? vibe.shadowOffset : 0;
  const svgW = w + shadowOffset;
  const svgH = h + shadowOffset;

  // Minimal vibe renders the mark as an outlined silhouette so the
  // bookmark reads as a frame rather than a chip.
  const isOutlined = vibeKey === 'minimal';
  const fillColor = isOutlined ? theme.background : theme.primary;
  const fillOpacity = isOutlined ? 1 : vibe.surfaceOpacity;
  const letterColor = isOutlined ? theme.text : theme.textOnPrimary;

  // Soft-shadow vibes (glass / clay) get a true platform shadow on the wrapper —
  // the SVG bounding box hugs the bookmark, so the shadow shape is acceptable.
  const wrapperShadow: ViewStyle =
    vibe.shadowStyle === 'soft'
      ? Platform.select<ViewStyle>({
          web: {
            filter: `drop-shadow(0 ${vibe.shadowOffset}px ${vibe.shadowBlur}px rgba(0,0,0,${vibe.shadowOpacity}))`,
          } as ViewStyle,
          default: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: vibe.shadowOffset },
            shadowOpacity: vibe.shadowOpacity,
            shadowRadius: vibe.shadowBlur,
          },
        }) ?? {}
      : {};

  // Only Retro tilts (matches the playful sticker aesthetic).
  const rotate = vibeKey === 'retro' ? -3 : 0;

  return (
    <View style={[styles.row, style]}>
      <View
        style={[
          styles.markWrap,
          wrapperShadow,
          {
            width: svgW,
            height: svgH,
            transform: [{ rotate: `${rotate}deg` }],
          },
        ]}>
        <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
          {/* Hard offset shadow drawn as a duplicate path so the shadow
              follows the bookmark silhouette (not a square bounding box). */}
          {vibe.shadowStyle === 'hard' ? (
            <Path
              d={path}
              fill={theme.shadow}
              transform={`translate(${shadowOffset} ${shadowOffset})`}
            />
          ) : null}
          <Path
            d={path}
            fill={fillColor}
            fillOpacity={fillOpacity}
            stroke={stroke > 0 ? theme.border : 'none'}
            strokeWidth={stroke}
            strokeLinejoin="round"
          />
        </Svg>
        {/* "B" overlay — using ThemedText so the display font matches the wordmark.
            Positioned in the upper rectangular portion of the bookmark, above the notch. */}
        <View
          pointerEvents="none"
          style={[
            styles.letterOverlay,
            { width: w, height: h - notch, top: 0, left: 0 },
          ]}>
          <ThemedText
            style={{
              color: letterColor,
              fontFamily: Fonts.display,
              fontSize: Math.round(size * 0.64),
              lineHeight: Math.round(size * 0.7),
              letterSpacing: -1,
              includeFontPadding: false,
            }}>
            B
          </ThemedText>
        </View>
      </View>

      {showWordmark ? (
        <ThemedText
          style={{
            color: theme.text,
            fontFamily: Fonts.display,
            fontSize: Math.round(size * 0.92),
            lineHeight: Math.round(size * 1.05),
            letterSpacing: -1.5,
            marginLeft: Math.round(size * 0.22),
          }}>
          BOOKIE
        </ThemedText>
      ) : null}
    </View>
  );
}

/**
 * Bookmark silhouette: rounded top corners, V-notch at the bottom.
 * `r` controls top-corner radius (0 → sharp), `notch` controls notch depth.
 */
function bookmarkPath(w: number, h: number, r: number, notch: number): string {
  if (r <= 0) {
    return [
      `M 0 0`,
      `H ${w}`,
      `V ${h}`,
      `L ${w / 2} ${h - notch}`,
      `L 0 ${h}`,
      `Z`,
    ].join(' ');
  }
  return [
    `M ${r} 0`,
    `H ${w - r}`,
    `Q ${w} 0 ${w} ${r}`,
    `V ${h}`,
    `L ${w / 2} ${h - notch}`,
    `L 0 ${h}`,
    `V ${r}`,
    `Q 0 0 ${r} 0`,
    `Z`,
  ].join(' ');
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markWrap: {
    position: 'relative',
  },
  letterOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
