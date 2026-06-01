import { useCallback, useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Body, Button, Card, ConfirmModal, Field, H2, H3, Row, Screen } from '../../src/components/UI';
import { addEmployee, deleteEmployee, getEmployees } from '../../src/store/store';
import { Employee } from '../../src/types';
import { theme } from '../../src/theme';

export default function Employees() {
  const [list, setList] = useState<Employee[]>([]);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Employee | null>(null);

  const reload = useCallback(async () => {
    setList(await getEmployees());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  async function add() {
    if (!name.trim()) return Alert.alert('Enter the employee name');
    if (pin.length < 4) return Alert.alert('PIN must be at least 4 digits');
    const dup = list.find((e) => e.pin === pin);
    if (dup) return Alert.alert('Another employee already uses that PIN');
    await addEmployee(name.trim(), pin);
    setName('');
    setPin('');
    reload();
  }


  return (
    <Screen>
      <Card>
        <H2>Add an employee</H2>
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Sarah" />
        <Field
          label="PIN (4+ digits)"
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={8}
          placeholder="••••"
        />
        <Button title="Add employee" onPress={add} />
      </Card>

      <H2>Team</H2>
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        ListEmptyComponent={
          <Card>
            <Body muted>No employees yet.</Body>
          </Card>
        }
        renderItem={({ item }) => (
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <H3 style={{ marginBottom: 0 }}>{item.name}</H3>
                <Body muted>PIN: {'•'.repeat(item.pin.length)}</Body>
              </View>
              <Button title="Remove" variant="danger" onPress={() => setPendingDelete(item)} />
            </Row>
          </Card>
        )}
      />
      <ConfirmModal
        visible={!!pendingDelete}
        title="Remove employee?"
        message={pendingDelete ? `Remove ${pendingDelete.name}? Their past logs will remain.` : ''}
        confirmLabel="Remove"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await deleteEmployee(pendingDelete.id);
          setPendingDelete(null);
          reload();
        }}
      />
    </Screen>
  );
}
