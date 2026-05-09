import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { getSession } from '../src/store/store';
import { theme } from '../src/theme';

export default function Index() {
  useEffect(() => {
    (async () => {
      const s = await getSession();
      if (!s) router.replace('/login');
      else if (s.role === 'admin') router.replace('/admin');
      else router.replace('/employee');
    })();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg }}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}
