import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Body, Button, Card, Field, H2, Screen } from '../../src/components/UI';
import { getAdminPin, setAdminPin } from '../../src/store/store';

export default function Settings() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  async function change() {
    const cur = await getAdminPin();
    if (current !== cur) return Alert.alert('Current PIN is incorrect');
    if (next.length < 4) return Alert.alert('New PIN must be at least 4 digits');
    if (next !== confirm) return Alert.alert('New PINs do not match');
    setBusy(true);
    try {
      await setAdminPin(next);
      setCurrent('');
      setNext('');
      setConfirm('');
      Alert.alert('Updated', 'Owner PIN has been changed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Card>
          <H2>Change owner PIN</H2>
          <Body muted>Only the owner should know this PIN. It controls all admin access.</Body>

          <Field label="Current PIN" value={current} onChangeText={setCurrent} secureTextEntry keyboardType="number-pad" />
          <Field label="New PIN" value={next} onChangeText={setNext} secureTextEntry keyboardType="number-pad" />
          <Field label="Confirm new PIN" value={confirm} onChangeText={setConfirm} secureTextEntry keyboardType="number-pad" />

          <Button title="Update PIN" onPress={change} loading={busy} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
