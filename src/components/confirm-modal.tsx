import { Trash, X } from 'phosphor-react-native';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Sticker } from '@/components/sticker';
import { StickerButton } from '@/components/sticker-button';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Sticker
            background={theme.background}
            style={styles.box}
            rotate={-1}>
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: destructive ? theme.danger : theme.backgroundSelected,
                    borderColor: theme.border,
                  },
                ]}>
                {destructive ? (
                  <Trash size={22} color="#FFF" weight="bold" />
                ) : (
                  <X size={22} color={theme.text} weight="bold" />
                )}
              </View>
              <ThemedText
                style={[styles.title, { color: theme.text, fontFamily: Fonts.display }]}>
                {title}
              </ThemedText>
            </View>
            {message ? (
              <ThemedText
                style={[styles.message, { color: theme.textSecondary, fontFamily: Fonts.sans }]}
                numberOfLines={4}>
                {message}
              </ThemedText>
            ) : null}
            <View style={styles.buttonRow}>
              <View style={styles.btnWrap}>
                <StickerButton
                  onPress={onCancel}
                  background={theme.backgroundElement}
                  radius={Radius.md}
                  padding={Spacing.three}>
                  <ThemedText
                    style={[styles.btnText, { color: theme.text, fontFamily: Fonts.display }]}>
                    {cancelLabel}
                  </ThemedText>
                </StickerButton>
              </View>
              <View style={styles.btnWrap}>
                <StickerButton
                  onPress={onConfirm}
                  background={destructive ? theme.danger : theme.primary}
                  radius={Radius.md}
                  padding={Spacing.three}>
                  <ThemedText
                    style={[
                      styles.btnText,
                      { color: theme.textOnPrimary, fontFamily: Fonts.display },
                    ]}>
                    {confirmLabel}
                  </ThemedText>
                </StickerButton>
              </View>
            </View>
          </Sticker>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000aa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  box: {
    width: '100%',
    maxWidth: 360,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    letterSpacing: -0.5,
    flex: 1,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  btnWrap: {
    flex: 1,
  },
  btnText: {
    fontSize: 18,
    letterSpacing: 1,
  },
});
