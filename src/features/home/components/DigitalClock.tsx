import React from 'react';
import { Text, View } from 'react-native';

export const DigitalClock = () => {
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeText = now.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  const dateText = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <View className="items-center pt-2">
      <Text className="font-manrope-extrabold text-5xl text-primary leading-[52px]">
        {timeText}
      </Text>
      <Text className="font-inter-medium text-base text-text-muted mt-1 mb-3.5">
        {dateText}
      </Text>
    </View>
  );
};
