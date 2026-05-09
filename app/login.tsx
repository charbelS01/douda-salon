import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Body, Button, Card, Field, H1, H2, Screen } from '../src/components/UI';
import { findEmployeeByPin, getAdminPin, setSession } from '../src/store/store';
import { theme } from '../src/theme';

export default function Login() {
  const [mode, setMode] = useState<'employee' | 'admin'>('employee');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    if (!pin.trim()) return Alert.alert('Enter your PIN');
    setBusy(true);
    try {
      if (mode === 'admin') {
        const adminPin = await getAdminPin();
        if (pin !== adminPin) {
          Alert.alert('Incorrect admin PIN');
          return;
        }
        await setSession({ role: 'admin' });
        router.replace('/admin');
      } else {
        const emp = await findEmployeeByPin(pin);
        if (!emp) {
          Alert.alert('No employee matches that PIN');
          return;
        }
        await setSession({ role: 'employee', employeeId: emp.id, employeeName: emp.name });
        router.replace('/employee');
      }
    } finally {
      setBusy(false);
      setPin('');
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingTop: theme.spacing.xl }} keyboardShouldPersistTaps="handled">
        <H1>Douda Salon</H1>
        <Body muted>Welcome back. Please sign in to log your work.</Body>

        <View style={{ height: theme.spacing.xl }} />

        <Card>
          <H2>{mode === 'admin' ? 'Owner sign in' : 'Employee sign in'}</H2>
          <Body muted style={{ marginBottom: theme.spacing.md }}>
            {mode === 'admin'
              ? 'Enter the owner PIN to access daily summaries.'
              : 'Enter your personal PIN to start logging clients.'}
          </Body>

          <Field
            label="PIN"
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            placeholder="••••"
            maxLength={8}
          />

          <Button title="Sign in" onPress={handleSignIn} loading={busy} />

          <View style={{ height: theme.spacing.md }} />

          <Button
            title={mode === 'admin' ? 'I am an employee' : 'I am the owner'}
            variant="ghost"
            onPress={() => {
              setMode(mode === 'admin' ? 'employee' : 'admin');
              setPin('');
            }}
          />
        </Card>

        <Body muted style={{ textAlign: 'center', marginTop: theme.spacing.md }}>
          Default owner PIN is 1234 — change it from the Owner ▸ Settings tab.
        </Body>
      </ScrollView>
    </Screen>
  );
}
