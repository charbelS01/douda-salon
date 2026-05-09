import { Stack, router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { setSession } from '../../src/store/store';
import { theme } from '../../src/theme';

export default function EmployeeLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.bg },
        headerTitleStyle: { color: theme.colors.text, fontWeight: '700' },
        headerTintColor: theme.colors.primary,
        contentStyle: { backgroundColor: theme.colors.bg },
        headerRight: () => (
          <Pressable
            onPress={async () => {
              await setSession(null);
              router.replace('/login');
            }}
            hitSlop={10}
          >
            <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Sign out</Text>
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Log a client' }} />
      <Stack.Screen name="my-day" options={{ title: 'My day' }} />
    </Stack>
  );
}
