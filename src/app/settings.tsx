import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckSquare,
  Devices,
  Envelope,
  FolderSimple,
  NotePencil,
  Palette,
  Sparkle,
  User as UserIcon,
  XLogo,
} from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Sticker } from '@/components/sticker';
import { StickerButton } from '@/components/sticker-button';
import { TapeStrip } from '@/components/tape-strip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Borders,
  Fonts,
  Radius,
  Spacing,
  ThemeMeta,
  Themes,
  VibeMeta,
  VibeOrder,
  Vibes,
  type ThemeKey,
  type ThemePalette,
  type VibeKey,
} from '@/constants/theme';
import {
  FOLLOW_SYSTEM_KEY,
  useThemeContext,
} from '@/hooks/theme-provider';
import { useTheme } from '@/hooks/use-theme';
import { getSetting, setSetting } from '@/lib/db';

const NAME_KEY = 'user_name';
const SUPPORT_EMAIL = 'iamabhishek1310@gmail.com';
const X_HANDLE = '0bhishek';
const X_URL = `https://x.com/${X_HANDLE}`;

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { themeKey, setThemeKey, vibeKey, setVibeKey } = useThemeContext();
  const [name, setName] = useState('');
  const [nameStatus, setNameStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    let alive = true;
    (async () => {
      const v = await getSetting(NAME_KEY);
      if (alive && v) setName(v);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const onNameChange = (next: string) => {
    setName(next);
    setNameStatus('saving');
    setSetting(NAME_KEY, next)
      .then(() => setNameStatus('saved'))
      .catch(() => setNameStatus('idle'));
  };

  const onSupportPress = () => {
    const subject = encodeURIComponent('Bookie — help / feedback');
    const body = encodeURIComponent(buildSupportBody(name));
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`).catch(
      () => {},
    );
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <StickerButton onPress={() => router.back()} padding={10} radius={Radius.md}>
            <ArrowLeft size={22} color={theme.text} weight="bold" />
          </StickerButton>
          <View style={styles.headerTextWrap}>
            <View style={styles.titleBrandRow}>
              <ThemedText
                style={[styles.title, { color: theme.text, fontFamily: Fonts.display }]}>
                SETTINGS
              </ThemedText>
              <TapeStrip
                color={theme.accent}
                width={48}
                height={12}
                rotate={-5}
                style={{ marginLeft: -6, marginTop: 8 }}
              />
            </View>
            <ThemedText
              style={[styles.tagline, { color: theme.textSecondary, fontFamily: Fonts.marker }]}>
              tune the scrapbook
            </ThemedText>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Name */}
          <Section icon={<UserIcon size={20} color={theme.text} weight="duotone" />} title="WHO ARE YOU">
            <Sticker background={theme.backgroundElement} style={styles.inputSticker}>
              <View style={styles.inputRow}>
                <TextInput
                  value={name}
                  onChangeText={onNameChange}
                  placeholder="your name"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    { color: theme.text, fontFamily: Fonts.sansBold },
                  ]}
                />
                {nameStatus !== 'idle' ? (
                  <ThemedText
                    style={[
                      styles.savedHint,
                      { color: theme.textSecondary, fontFamily: Fonts.marker },
                    ]}>
                    {nameStatus === 'saving' ? 'saving…' : '✓ saved'}
                  </ThemedText>
                ) : null}
              </View>
            </Sticker>
          </Section>

          {/* Vibes — chooses the visual form (borders, shadows, decorations) */}
          <Section icon={<Sparkle size={20} color={theme.text} weight="duotone" />} title="VIBES">
            <ThemedText
              style={[styles.copy, { color: theme.textSecondary, fontFamily: Fonts.sans }]}>
              the look + feel. colors below.
            </ThemedText>
            <View style={styles.themeGrid}>
              {VibeOrder.map((v) => (
                <VibeCard
                  key={v}
                  vibeKey={v}
                  active={vibeKey === v}
                  onPress={() => setVibeKey(v)}
                  palette={theme}
                />
              ))}
            </View>
          </Section>

          {/* Colors — chooses palette within the current vibe */}
          <Section icon={<Palette size={20} color={theme.text} weight="duotone" />} title="COLORS">
            <View style={styles.themeGrid}>
              <ThemeCard
                paletteKey={'__system__' as ThemeKey}
                label="Auto"
                tagline="follow device"
                active={themeKey === FOLLOW_SYSTEM_KEY}
                onPress={() => setThemeKey(FOLLOW_SYSTEM_KEY)}
                preview={Themes.cream}
                isAuto
              />
              {(Object.keys(Themes) as ThemeKey[]).map((key) => (
                <ThemeCard
                  key={key}
                  paletteKey={key}
                  label={ThemeMeta[key].label}
                  tagline={ThemeMeta[key].tagline}
                  active={themeKey === key}
                  onPress={() => setThemeKey(key)}
                  preview={Themes[key]}
                />
              ))}
            </View>
          </Section>

          {/* Quick nav */}
          <Section icon={<FolderSimple size={20} color={theme.text} weight="duotone" />} title="JUMP TO">
            <View style={styles.navGrid}>
              <NavTile
                icon={<NotePencil size={26} color={theme.text} weight="duotone" />}
                label="NOTES"
                onPress={() => router.push('/notes')}
              />
              <NavTile
                icon={<CheckSquare size={26} color={theme.text} weight="duotone" />}
                label="TODOS"
                onPress={() => router.push('/todos')}
              />
              <NavTile
                icon={<FolderSimple size={26} color={theme.text} weight="duotone" />}
                label="HOME"
                onPress={() => router.replace('/')}
              />
            </View>
          </Section>

          {/* Support */}
          <Section icon={<Envelope size={20} color={theme.text} weight="duotone" />} title="HELP / FEEDBACK">
            <ThemedText
              style={[styles.copy, { color: theme.textSecondary, fontFamily: Fonts.sans }]}>
              found a bug, want a feature, or just wanna say hi? this opens your
              mail app pre-filled with device info.
            </ThemedText>
            <StickerButton
              onPress={onSupportPress}
              background={theme.primary}
              radius={Radius.md}
              padding={Spacing.three}>
              <View style={styles.ctaInner}>
                <Envelope size={20} color={theme.textOnPrimary} weight="bold" />
                <ThemedText
                  style={[
                    styles.cta,
                    { color: theme.textOnPrimary, fontFamily: Fonts.display },
                  ]}>
                  EMAIL SUPPORT
                </ThemedText>
              </View>
            </StickerButton>
            <ThemedText
              style={[styles.copy, { color: theme.textSecondary, fontFamily: Fonts.marker }]}
              selectable>
              {SUPPORT_EMAIL}
            </ThemedText>
          </Section>

          {/* Follow on X */}
          <Section icon={<XLogo size={20} color={theme.text} weight="duotone" />} title="FOLLOW">
            <ThemedText
              style={[styles.copy, { color: theme.textSecondary, fontFamily: Fonts.sans }]}>
              built by abhishek — say hi, share what you're using bookie for,
              or just shitpost together.
            </ThemedText>
            <StickerButton
              onPress={() => Linking.openURL(X_URL).catch(() => {})}
              background={theme.text}
              radius={Radius.md}
              padding={Spacing.three}>
              <View style={styles.ctaInner}>
                <XLogo size={20} color={theme.background} weight="fill" />
                <ThemedText
                  style={[
                    styles.cta,
                    { color: theme.background, fontFamily: Fonts.display },
                  ]}>
                  @{X_HANDLE}
                </ThemedText>
              </View>
            </StickerButton>
          </Section>

          {/* About */}
          <Section icon={<Devices size={20} color={theme.text} weight="duotone" />} title="ABOUT">
            <Sticker background={theme.backgroundElement} style={styles.aboutSticker}>
              <ThemedText
                style={[styles.aboutLine, { color: theme.text, fontFamily: Fonts.sansBold }]}>
                Bookie · v{Constants.expoConfig?.version ?? '1.0.0'}
              </ThemedText>
              <ThemedText
                style={[styles.aboutSub, { color: theme.textSecondary, fontFamily: Fonts.sans }]}>
                {Device.modelName ?? 'unknown device'} · {formatOS()}
              </ThemedText>
            </Sticker>
          </Section>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(220).springify().damping(18)} style={styles.section}>
      <View style={styles.sectionHeader}>
        <View
          style={[
            styles.sectionIcon,
            { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
          ]}>
          {icon}
        </View>
        <ThemedText
          style={[styles.sectionTitle, { color: theme.text, fontFamily: Fonts.display }]}>
          {title}
        </ThemedText>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </Animated.View>
  );
}

function ThemeCard({
  label,
  tagline,
  active,
  onPress,
  preview,
  isAuto,
}: {
  paletteKey: ThemeKey;
  label: string;
  tagline: string;
  active: boolean;
  onPress: () => void;
  preview: (typeof Themes)[ThemeKey];
  isAuto?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.themeCardWrap}>
      <Sticker
        background={preview.background}
        borderColor={preview.border}
        shadowColor={preview.shadow}
        shadowOffset={active ? 3 : 2}
        borderWidth={active ? Borders.chonk : Borders.thick}
        style={styles.themeCard}>
        <View style={styles.themeSwatchRow}>
          <View
            style={[
              styles.swatch,
              { backgroundColor: preview.primary, borderColor: preview.border },
            ]}
          />
          <View
            style={[
              styles.swatch,
              { backgroundColor: preview.accent, borderColor: preview.border },
            ]}
          />
          <View
            style={[
              styles.swatch,
              {
                backgroundColor: preview.backgroundSelected,
                borderColor: preview.border,
              },
            ]}
          />
        </View>
        <ThemedText
          style={[styles.themeLabel, { color: preview.text, fontFamily: Fonts.display }]}>
          {label.toUpperCase()}
        </ThemedText>
        <ThemedText
          style={[styles.themeTag, { color: preview.textSecondary, fontFamily: Fonts.marker }]}>
          {isAuto ? 'system' : tagline}
        </ThemedText>
        {active ? (
          <View
            style={[
              styles.activeBadge,
              { backgroundColor: theme.primary, borderColor: theme.border },
            ]}>
            <ThemedText
              style={[
                styles.activeBadgeText,
                { color: theme.textOnPrimary, fontFamily: Fonts.display },
              ]}>
              ON
            </ThemedText>
          </View>
        ) : null}
      </Sticker>
    </Pressable>
  );
}

function VibeCard({
  vibeKey,
  active,
  onPress,
  palette,
}: {
  vibeKey: VibeKey;
  active: boolean;
  onPress: () => void;
  palette: ThemePalette;
}) {
  const meta = VibeMeta[vibeKey];
  const form = Vibes[vibeKey];

  // Preview tile renders using THIS vibe's form so the user sees what they'll get.
  const previewShadow = form.shadowStyle === 'hard'
    ? {
        shadowColor: palette.shadow,
        shadowOffset: { width: form.shadowOffset, height: form.shadowOffset },
        shadowOpacity: 1,
        shadowRadius: 0,
      }
    : form.shadowStyle === 'soft'
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: form.shadowOffset },
        shadowOpacity: form.shadowOpacity,
        shadowRadius: form.shadowBlur,
        elevation: Math.round(form.shadowOffset),
      }
    : {};

  return (
    <Pressable onPress={onPress} style={styles.themeCardWrap}>
      <View
        style={[
          styles.vibePreview,
          {
            backgroundColor: palette.backgroundElement,
            borderColor: form.borderWidth > 0 ? palette.border : 'transparent',
            borderWidth: active ? Math.max(form.borderWidth, 2) + 1 : form.borderWidth,
            borderRadius: form.radius,
          },
          previewShadow,
        ]}>
          <View style={styles.vibePreviewInner}>
            <View
              style={[
                styles.vibeMiniBlock,
                {
                  backgroundColor: palette.primary,
                  borderRadius: form.radiusSmall,
                },
              ]}
            />
            <View
              style={[
                styles.vibeMiniBlock,
                {
                  backgroundColor: palette.accent,
                  borderRadius: form.radiusSmall,
                  width: '70%',
                },
              ]}
            />
            <View
              style={[
                styles.vibeMiniBlock,
                {
                  backgroundColor: palette.backgroundSelected,
                  borderRadius: form.radiusSmall,
                  width: '40%',
                },
              ]}
            />
          </View>
          <ThemedText
            style={[
              styles.themeLabel,
              { color: palette.text, fontFamily: Fonts.display },
            ]}>
            {meta.label.toUpperCase()}
          </ThemedText>
          <ThemedText
            style={[
              styles.themeTag,
              { color: palette.textSecondary, fontFamily: Fonts.sans },
            ]}>
            {meta.tagline}
          </ThemedText>
          {active ? (
            <View
              style={[
                styles.activeBadge,
                { backgroundColor: palette.primary, borderColor: palette.border },
              ]}>
              <ThemedText
                style={[
                  styles.activeBadgeText,
                  { color: palette.textOnPrimary, fontFamily: Fonts.display },
                ]}>
                ON
              </ThemedText>
            </View>
          ) : null}
      </View>
    </Pressable>
  );
}

function NavTile({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.navTileWrap}>
      <StickerButton
        onPress={onPress}
        background={theme.backgroundElement}
        radius={Radius.md}
        padding={Spacing.three}>
        <View style={styles.navTileInner}>
          {icon}
          <ThemedText
            style={[styles.navTileLabel, { color: theme.text, fontFamily: Fonts.display }]}>
            {label}
          </ThemedText>
        </View>
      </StickerButton>
    </View>
  );
}

/**
 * Friendly OS string. `Platform.Version` on Android returns the SDK API
 * level (e.g. `30` = Android 11), which is meaningless to a user. We
 * prefer expo-device's `osVersion` which returns the actual release
 * version string (e.g. `"11"`), and capitalize the platform name.
 */
const formatOS = (): string => {
  const version = Device.osVersion ?? String(Platform.Version);
  const name = Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS;
  return `${name} ${version}`;
};

const buildSupportBody = (name: string) => {
  const lines = [
    `Hi Abhishek,`,
    ``,
    `[describe your issue, idea, or feedback here]`,
    ``,
    `---`,
    name ? `From: ${name}` : `From: (unnamed user)`,
    `App: Bookie v${Constants.expoConfig?.version ?? '1.0.0'}`,
    `Device: ${Device.manufacturer ?? '?'} ${Device.modelName ?? '?'}`,
    `OS: ${formatOS()}`,
    `Locale: ${Constants.systemFonts?.length ? 'native' : 'web'}`,
  ];
  return lines.join('\n');
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  headerTextWrap: {
    flex: 1,
    gap: Spacing.one,
  },
  titleBrandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 15,
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six * 2,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionIcon: {
    padding: 8,
    borderWidth: Borders.thick,
  },
  sectionTitle: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  sectionBody: {
    gap: Spacing.two,
  },
  inputSticker: {
    padding: 0,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  input: {
    flex: 1,
    fontSize: 18,
    paddingVertical: Spacing.three,
  },
  savedHint: {
    fontSize: 14,
    paddingHorizontal: Spacing.two,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  vibePreview: {
    padding: Spacing.three,
    gap: Spacing.two,
    minHeight: 130,
  },
  vibePreviewInner: {
    gap: 6,
  },
  vibeMiniBlock: {
    height: 8,
    width: '100%',
  },
  themeCardWrap: {
    width: '47%',
  },
  themeCard: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  themeSwatchRow: {
    flexDirection: 'row',
    gap: 4,
  },
  swatch: {
    width: 20,
    height: 20,
    borderWidth: Borders.thin,
  },
  themeLabel: {
    fontSize: 20,
    letterSpacing: -0.5,
  },
  themeTag: {
    fontSize: 13,
  },
  activeBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
    borderWidth: Borders.thick,
    transform: [{ rotate: '6deg' }],
  },
  activeBadgeText: {
    fontSize: 13,
    letterSpacing: 1,
  },
  navGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  navTileWrap: {
    flex: 1,
  },
  navTileInner: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
  navTileLabel: {
    fontSize: 14,
    letterSpacing: 1,
  },
  copy: {
    fontSize: 15,
    lineHeight: 22,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cta: {
    fontSize: 20,
    letterSpacing: 1,
  },
  aboutSticker: {
    padding: Spacing.three,
    gap: 4,
  },
  aboutLine: {
    fontSize: 16,
    letterSpacing: 0.5,
  },
  aboutSub: {
    fontSize: 14,
  },
});
