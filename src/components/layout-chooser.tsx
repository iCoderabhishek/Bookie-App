import { Rows, SquaresFour } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { StickerButton } from '@/components/sticker-button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FeedLayout = 'list' | 'wall';

type Props = {
  value: FeedLayout;
  onChange: (next: FeedLayout) => void;
};

export function LayoutChooser({ value, onChange }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <StickerButton
        onPress={() => onChange('list')}
        background={value === 'list' ? theme.backgroundSelected : theme.backgroundElement}
        radius={Radius.sm}
        shadowOffset={2}
        padding={8}>
        <Rows size={18} color={theme.text} weight={value === 'list' ? 'fill' : 'bold'} />
      </StickerButton>
      <StickerButton
        onPress={() => onChange('wall')}
        background={value === 'wall' ? theme.backgroundSelected : theme.backgroundElement}
        radius={Radius.sm}
        shadowOffset={2}
        padding={8}>
        <SquaresFour
          size={18}
          color={theme.text}
          weight={value === 'wall' ? 'fill' : 'bold'}
        />
      </StickerButton>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
});
