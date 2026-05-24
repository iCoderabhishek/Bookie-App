import { StyleSheet, View, type ViewStyle } from 'react-native';

type Props = {
  color?: string;
  width?: number;
  height?: number;
  rotate?: number;
  style?: ViewStyle;
};

export function TapeStrip({
  color = '#FFE45C',
  width = 64,
  height = 20,
  rotate = -8,
  style,
}: Props) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.tape,
        {
          backgroundColor: color,
          width,
          height,
          transform: [{ rotate: `${rotate}deg` }],
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  tape: {
    opacity: 0.85,
    borderColor: '#0A0A0A',
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
});
