import type { Router } from 'expo-router';

export function goBackOrTabs(router: Router) {
  router.dismissTo('/(tabs)' as any);
}
