import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const NotificationManager = {
  /**
   * Registers for push notifications, sets up channels (Android),
   * and returns the Expo Push Token.
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return null;
    }

    if (!Device.isDevice) {
      console.log('[NotificationManager] Must use a physical device for Push Notifications');
      return null;
    }

    try {
      // 1. Configure Android-specific notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#000666',
        });
      }

      // 2. Request & check permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[NotificationManager] Failed to get push token for push notifications!');
        return null;
      }

      // 3. Get Project ID (needed for EAS build and Expo Push Token)
      const projectId = 
        Constants.expoConfig?.extra?.eas?.projectId ?? 
        Constants.easConfig?.projectId;

      if (!projectId) {
        console.warn('[NotificationManager] Project ID not found in Constants. Make sure EAS/projectId is configured in app.json.');
      }

      // 4. Retrieve the Expo Push Token (Optional, keep for Expo infra)
      const expoTokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const expoToken = expoTokenData.data;

      // 5. Retrieve the Native Device Token (FCM Token for Android, APNs for iOS)
      // This is the token usually required by direct backend integrations
      const nativeTokenData = await Notifications.getDevicePushTokenAsync();
      const nativeToken = nativeTokenData.data;

      console.log('======================================================');
      console.log('[NotificationManager] Registration Successful');
      console.log('EXPO TOKEN:', expoToken);
      console.log('NATIVE DEVICE TOKEN:', nativeToken);
      console.log('======================================================');

      // Return the native token as it's more standard for direct FCM backends
      return nativeToken;
    } catch (error) {
      console.error('[NotificationManager] Error during token registration:', error);
      return null;
    }
  },

  /**
   * Sets up notification listeners for received and clicked notifications.
   * Returns a cleanup function.
   */
  setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ): () => void {
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[NotificationManager] Foreground notification received:', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[NotificationManager] User interacted/tapped notification:', response);
      if (onNotificationResponse) {
        onNotificationResponse(response);
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  },
};
