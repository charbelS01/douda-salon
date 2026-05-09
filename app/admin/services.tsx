import { useCallback, useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Body, Button, Card, Field, H2, H3, Row, Screen } from '../../src/components/UI';
import { addService, deleteService, getServices } from '../../src/store/store';
import { Service } from '../../src/types';
import { theme } from '../../src/theme';

export default function Services() {
  const [list, setList] = useState<Service[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const reload = useCallback(async () => {
    setList(await getServices());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  async function add() {
    if (!name.trim()) return Alert.alert('Enter the service name');
    const p = Number(price);
    if (!Number.isFinite(p) || p < 0) return Alert.alert('Enter a valid price');
    await addService(name.trim(), p);
    setName('');
    setPrice('');
    reload();
  }

  function confirmDelete(s: Service) {
    Alert.alert('Remove service?', `Remove ${s.name}? Past logs are kept.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteService(s.id);
          reload();
        },
      },
    ]);
  }

  return (
    <Screen>
      <Card>
        <H2>Add a service</H2>
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Balayage" />
        <Field
          label="Price"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
        <Button title="Add service" onPress={add} />
      </Card>

      <H2>Service menu</H2>
      <FlatList
        data={list}
        keyExtractor={(s) => s.id}
        ListEmptyComponent={
          <Card>
            <Body muted>No services yet.</Body>
          </Card>
        }
        renderItem={({ item }) => (
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <H3 style={{ marginBottom: 0 }}>{item.name}</H3>
                <Body muted>${item.price.toFixed(2)}</Body>
              </View>
              <Button title="Remove" variant="danger" onPress={() => confirmDelete(item)} />
            </Row>
          </Card>
        )}
      />
    </Screen>
  );
}
