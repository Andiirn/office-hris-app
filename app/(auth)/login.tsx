// app/(auth)/login.tsx
import React from 'react';
import { View, Text, TextInput, Button } from 'react-native';

export default function LoginScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Login</Text>
      <TextInput placeholder="NIK" style={{ borderWidth: 1, padding: 10, marginBottom: 10 }} />
      <TextInput placeholder="Password" secureTextEntry style={{ borderWidth: 1, padding: 10, marginBottom: 20 }} />
      <Button title="Login" onPress={() => {}} />
    </View>
  );
}
