import { Image } from 'expo-image';
import { ArrowRight } from 'phosphor-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookieLogo } from '@/components/bookie-logo';
import { Sticker } from '@/components/sticker';
import { StickerButton } from '@/components/sticker-button';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVibeKey } from '@/hooks/use-vibe';

// Illustrations carry their own warm-cream canvas (#F4ECD8) so the frame reads
// as a print regardless of the active theme — only the chrome around it themes.
const SLIDE_CANVAS = '#F4ECD8';

type FeatureSlide = {
  // Metro resolves a static asset require() to a numeric module id.
  image: number;
  title: string;
  body: string;
};

const FEATURE_SLIDES: FeatureSlide[] = [
  {
    image: require('../../../assets/images/bookie-slide-1.webp'),
    title: 'PASTE A LINK,\nGET THE GIST',
    body: 'Bookie reads it for you and writes a short summary. Title, tags, thumbnail, done.',
  },
  {
    image: require('../../../assets/images/bookie-slide-2.webp'),
    title: 'SHARE FROM\nANYWHERE',
    body: 'Hit share in any app, pick Bookie, and the link is waiting when you open it.',
  },
  {
    image: require('../../../assets/images/bookie-slide-3.webp'),
    title: 'FIND IT LATER,\nKEEP IT PRIVATE',
    body: 'Search, tag, and jot your own notes. Everything stays on your phone. No account, no cloud.',
  },
];

// Feature slides + one personalization step at the end.
const PAGE_COUNT = FEATURE_SLIDES.length + 1;
const NAME_INDEX = FEATURE_SLIDES.length;

export function OnboardingCarousel({
  onComplete,
}: {
  onComplete: (name: string) => void;
}) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [page, setPage] = useState(0);
  const [name, setName] = useState('');

  const isLast = page >= PAGE_COUNT - 1;

  // Size the framed illustration (4:5 artwork) so it never crowds the headline
  // or footer on short screens: cap at 380dp wide and at half the screen height.
  let cardW = Math.min(width - Spacing.four * 2, 380);
  let cardH = cardW * 1.25;
  const maxCardH = height * 0.5;
  if (cardH > maxCardH) {
    cardH = maxCardH;
    cardW = cardH / 1.25;
  }

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const scrollToPage = useCallback(
    (next: number) => {
      // Set eagerly: a programmatic scrollTo doesn't reliably fire
      // onMomentumScrollEnd on Android, which would leave `page` stale.
      setPage(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    },
    [width],
  );

  // The single action that "establishes" the user and starts the count.
  const complete = useCallback(() => onComplete(name), [onComplete, name]);

  const goNext = useCallback(() => {
    if (page >= PAGE_COUNT - 1) {
      complete();
      return;
    }
    scrollToPage(page + 1);
  }, [page, scrollToPage, complete]);

  // Skip the tour but still land on the personalization step — completion only
  // ever happens via Get Started, never a silent skip.
  const skipToEnd = useCallback(() => scrollToPage(NAME_INDEX), [scrollToPage]);

  // Hardware back: step to the previous slide, and on the first slide swallow
  // the press so it never drops the user onto the (covered) home screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (page > 0) scrollToPage(page - 1);
      return true;
    });
    return () => sub.remove();
  }, [page, scrollToPage]);

  return (
    <Animated.View
      entering={FadeIn.duration(280)}
      exiting={FadeOut.duration(240)}
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: theme.background, zIndex: 1000, elevation: 1000 },
      ]}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <BookieLogo size={22} />
            {isLast ? (
              <View style={styles.skipSpacer} />
            ) : (
              <Pressable onPress={skipToEnd} hitSlop={12}>
                <ThemedText
                  style={[
                    styles.skip,
                    { color: theme.textSecondary, fontFamily: Fonts.marker },
                  ]}>
                  skip
                </ThemedText>
              </Pressable>
            )}
          </View>

          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={scrollHandler}
            onMomentumScrollEnd={onMomentumEnd}
            scrollEventThrottle={16}
            style={styles.flex}>
            {FEATURE_SLIDES.map((slide, i) => (
              <SlidePage
                key={i}
                slide={slide}
                index={i}
                scrollX={scrollX}
                width={width}
                cardW={cardW}
                cardH={cardH}
              />
            ))}
            <NameStep
              index={NAME_INDEX}
              scrollX={scrollX}
              width={width}
              name={name}
              onChangeName={setName}
              onSubmit={complete}
            />
          </Animated.ScrollView>

          <View style={styles.footer}>
            <View style={styles.dots}>
              {Array.from({ length: PAGE_COUNT }).map((_, i) => (
                <Dot key={i} index={i} scrollX={scrollX} width={width} />
              ))}
            </View>

            <StickerButton
              onPress={goNext}
              background={theme.primary}
              radius={Radius.md}
              shadowOffset={5}>
              <View style={styles.ctaInner}>
                <ThemedText
                  style={[
                    styles.ctaLabel,
                    { color: theme.textOnPrimary, fontFamily: Fonts.display },
                  ]}>
                  {isLast ? 'GET STARTED' : 'NEXT'}
                </ThemedText>
                <ArrowRight size={20} color={theme.textOnPrimary} weight="bold" />
              </View>
            </StickerButton>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Animated.View>
  );
}

function SlidePage({
  slide,
  index,
  scrollX,
  width,
  cardW,
  cardH,
}: {
  slide: FeatureSlide;
  index: number;
  scrollX: SharedValue<number>;
  width: number;
  cardW: number;
  cardH: number;
}) {
  const vibeKey = useVibeKey();
  const tilt = vibeKey === 'retro' ? -2 : 0;
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          scrollX.value,
          inputRange,
          [width * 0.16, 0, -width * 0.16],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(scrollX.value, inputRange, [0.9, 1, 0.9], Extrapolation.CLAMP),
      },
    ],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollX.value, inputRange, [24, 0, 24], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <View style={[styles.slide, { width }]}>
      <View style={styles.cardWrap}>
        <Animated.View style={cardStyle}>
          <Sticker
            background={SLIDE_CANVAS}
            radius={Radius.lg}
            rotate={tilt}
            style={{ width: cardW, height: cardH }}>
            <View style={styles.imageClip}>
              <Image
                source={slide.image}
                style={styles.image}
                contentFit="cover"
                transition={200}
              />
            </View>
          </Sticker>
        </Animated.View>
      </View>

      <Animated.View style={[styles.textWrap, textStyle]}>
        <ThemedText style={styles.title}>{slide.title}</ThemedText>
        <ThemedText style={styles.body} themeColor="textSecondary">
          {slide.body}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

function NameStep({
  index,
  scrollX,
  width,
  name,
  onChangeName,
  onSubmit,
}: {
  index: number;
  scrollX: SharedValue<number>;
  width: number;
  name: string;
  onChangeName: (next: string) => void;
  onSubmit: () => void;
}) {
  const theme = useTheme();
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollX.value, inputRange, [24, 0, 24], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View style={[styles.nameWrap, contentStyle]}>
        <BookieLogo size={40} showWordmark={false} />
        <ThemedText style={[styles.title, styles.nameTitle]}>{'ALMOST\nTHERE'}</ThemedText>
        <ThemedText style={styles.body} themeColor="textSecondary">
          What should we call you? You can always change this later in Settings.
        </ThemedText>

        <Sticker
          background={theme.backgroundElement}
          radius={Radius.md}
          style={styles.inputSticker}>
          <View style={styles.inputInner}>
            <ThemedText
              style={[styles.inputLabel, { color: theme.text, fontFamily: Fonts.marker }]}>
              NAME:
            </ThemedText>
            <TextInput
              value={name}
              onChangeText={onChangeName}
              placeholder="your name"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={onSubmit}
              maxLength={40}
              style={[styles.input, { color: theme.text, fontFamily: Fonts.sansBold }]}
            />
          </View>
        </Sticker>
      </Animated.View>
    </View>
  );
}

function Dot({
  index,
  scrollX,
  width,
}: {
  index: number;
  scrollX: SharedValue<number>;
  width: number;
}) {
  const theme = useTheme();
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const style = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP),
    opacity: interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolation.CLAMP),
    backgroundColor: interpolateColor(scrollX.value, inputRange, [
      theme.textSecondary,
      theme.primary,
      theme.textSecondary,
    ]),
  }));

  return <Animated.View style={[styles.dot, { borderColor: theme.border }, style]} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    minHeight: 44,
  },
  skip: {
    fontSize: 18,
  },
  skipSpacer: {
    width: 1,
    height: 24,
  },
  slide: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  cardWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageClip: {
    flex: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textWrap: {
    alignItems: 'center',
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 30,
    lineHeight: 34,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  body: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 340,
  },
  nameWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  nameTitle: {
    marginTop: Spacing.two,
  },
  inputSticker: {
    width: '100%',
    maxWidth: 380,
    marginTop: Spacing.two,
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  inputLabel: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    fontSize: 18,
    paddingVertical: Spacing.one,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three - 2,
  },
  ctaLabel: {
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
