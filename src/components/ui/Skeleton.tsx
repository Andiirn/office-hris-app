import { View, ViewStyle, DimensionValue } from 'react-native';

type SkeletonProps = {
  height?: DimensionValue;
  width?: DimensionValue;
  radius?: number;
  style?: ViewStyle;
};

export function Skeleton({ height = 16, width = '100%', radius = 12, style }: SkeletonProps) {
  return (
    <View
      style={[
        {
          height,
          width,
          borderRadius: radius,
          backgroundColor: 'rgba(198, 197, 212, 0.35)',
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3">
      <Skeleton height={16} width="40%" />
      <Skeleton height={14} width="75%" style={{ marginTop: 12 }} />
      <Skeleton height={14} width="55%" style={{ marginTop: 8 }} />
    </View>
  );
}
