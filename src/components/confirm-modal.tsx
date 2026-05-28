import { Trash, WarningCircle } from 'phosphor-react-native';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';

import { Sticker } from '@/components/sticker';
import { StickerButton } from '@/components/sticker-button';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVibe } from '@/hooks/use-vibe';

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  visible,
  title = 'ARE YOU SURE?',
  message,
  confirmLabel = 'DELETE',
  cancelLabel = 'KEEP',
  destructive = true,
  onConfirm,
  onCancel,
}: Props) {
  const theme = useTheme();
  const vibe = useVibe();

  // Modal needs to be readable — never translucent, even on glass vibe.
  const surfaceBg = theme.background;
  const accentColor = destructive ? theme.danger : theme.primary;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onCancel}>
      {visible ? (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          style={styles.backdrop}>
          <Pressable style={styles.backdropPress} onPress={onCancel}>
            <Pressable onPress={(e) => e.stopPropagation()} style={styles.cardWrap}>
              <Animated.View
                entering={ZoomIn.duration(160)}
                exiting={ZoomOut.duration(120)}>
                <Sticker background={surfaceBg} style={styles.box}>
                  {/* Accent stripe — color cue without needing a giant icon */}
                  <View
                    style={[
                      styles.accentStripe,
                      { backgroundColor: accentColor },
                    ]}
                  />

                  <View style={styles.headerRow}>
                    <View
                      style={[
                        styles.iconBadge,
                        {
                          backgroundColor: accentColor,
                          borderColor: theme.border,
                          borderWidth: vibe.borderWidth > 0 ? vibe.borderWidth : 0,
                          borderRadius: vibe.radiusSmall,
                        },
                      ]}>
                      {destructive ? (
                        <Trash size={20} color={theme.textOnPrimary} weight="fill" />
                      ) : (
                        <WarningCircle
                          size={22}
                          color={theme.textOnPrimary}
                          weight="fill"
                        />
                      )}
                    </View>
                    <ThemedText
                      style={[
                        styles.title,
                        { color: theme.text, fontFamily: Fonts.display },
                      ]}>
                      {title}
                    </ThemedText>
                  </View>

                  {message ? (
                    <ThemedText
                      style={[
                        styles.message,
                        { color: theme.textSecondary, fontFamily: Fonts.sans },
                      ]}>
                      {message}
                    </ThemedText>
                  ) : null}

                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: theme.border, opacity: 0.18 },
                    ]}
                  />

                  <View style={styles.buttonRow}>
                    {/* Ghost cancel — lower visual weight than the destructive action */}
                    <View style={styles.cancelWrap}>
                      <StickerButton
                        onPress={onCancel}
                        background={theme.background}
                        borderColor={theme.border}
                        padding={Spacing.three}>
                        <ThemedText
                          style={[
                            styles.btnText,
                            { color: theme.text, fontFamily: Fonts.display },
                          ]}>
                          {cancelLabel}
                        </ThemedText>
                      </StickerButton>
                    </View>
                    {/* Confirm — full color, takes more space */}
                    <View style={styles.confirmWrap}>
                      <StickerButton
                        onPress={onConfirm}
                        background={accentColor}
                        padding={Spacing.three}>
                        <View style={styles.confirmInner}>
                          {destructive ? (
                            <Trash
                              size={18}
                              color={theme.textOnPrimary}
                              weight="bold"
                            />
                          ) : null}
                          <ThemedText
                            style={[
                              styles.btnText,
                              {
                                color: theme.textOnPrimary,
                                fontFamily: Fonts.display,
                              },
                            ]}>
                            {confirmLabel}
                          </ThemedText>
                        </View>
                      </StickerButton>
                    </View>
                  </View>
                </Sticker>
              </Animated.View>
            </Pressable>
          </Pressable>
        </Animated.View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  backdropPress: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 380,
  },
  box: {
    padding: Spacing.four,
    gap: Spacing.three,
    overflow: 'hidden',
  },
  accentStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.one,
  },
  iconBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    letterSpacing: -0.5,
    flex: 1,
    lineHeight: 26,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  cancelWrap: {
    flex: 1,
  },
  confirmWrap: {
    flex: 1.4,
  },
  confirmInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  btnText: {
    fontSize: 17,
    letterSpacing: 1,
  },
});
