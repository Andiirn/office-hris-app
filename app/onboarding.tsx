import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import LottieView from 'lottie-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/stores/auth.store';

export default function OnboardingScreen() {
  const router = useRouter();
  const { setOnboardingSeen } = useAuthStore();

  const handleFinish = async () => {
    await setOnboardingSeen();
    // After setting it to seen, the _layout.tsx will automatically redirect 
    // to login because hasSeenOnboarding is now true.
    // However, it's safer to just push the navigation to be sure.
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <LottieView
        source={require('../assets/Be Bold.json')}
        autoPlay
        loop={false}
        onAnimationFinish={handleFinish}
        style={styles.lottie}
        resizeMode="cover"
      />
      
      <Pressable style={styles.skipButton} onPress={handleFinish}>
        <Text style={styles.skipText}>Mulai Aplikasi</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbf9f8', // surface color from design.md
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  skipButton: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: '#000666', // primary token
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  skipText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
