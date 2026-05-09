import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { format, isSameDay, parseISO } from 'date-fns';
import { Body, Card, H2, H3, Pill, Row, Screen } from '../../src/components/UI';
import { deleteLog, getLogs, getSession } from '../../src/store/store';
import { WorkLog } from '../../src/types';
import { formatMinutes } from '../../src/store/summary';
import { theme } from '../../src/theme';
import { differenceInMinutes } from 'date-fns';

export default function MyDay() {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [name, setName] = useState('');

  const reload = useCallback(async () => {
    const s = await getSession();
    if (!s || s.role !== 'employee') {
      router.replace('/login');
      return;
    }
    setName(s.employeeName ?? '');
    const all = await getLogs();
    const today = new Date();
    setLogs(
      all
        .filter((l) => l.employeeId === s.employeeId && isSameDay(parseISO(l.startISO), today))
        .sort((a, b) => a.startISO.localeCompare(b.startISO))
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const totalMin = logs.reduce(
    (acc, l) => acc + Math.max(0, differenceInMinutes(parseISO(l.endISO), parseISO(l.startISO))),
    0
  );
  const totalIncome = logs.reduce((acc, l) => acc + l.servicePrice, 0);

  function confirmDelete(id: string) {
    Alert.alert('Remove entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteLog(id);
          reload();
        },
      },
    ]);
  }

  return (
    <Screen>
      <Pill label={name} />
      <View style={{ height: theme.spacing.md }} />

      <Card>
        <H2>{format(new Date(), 'EEEE, MMMM d')}</H2>
        <Row style={{ justifyContent: 'space-between', marginTop: theme.spacing.sm }}>
          <View>
            <Body muted>Clients</Body>
            <H3 style={{ marginBottom: 0 }}>{logs.length}</H3>
          </View>
          <View>
            <Body muted>Hours worked</Body>
            <H3 style={{ marginBottom: 0 }}>{formatMinutes(totalMin)}</H3>
          </View>
          <View>
            <Body muted>Earnings</Body>
            <H3 style={{ marginBottom: 0 }}>${totalIncome.toFixed(2)}</H3>
          </View>
        </Row>
      </Card>

      <FlatList
        data={logs}
        keyExtractor={(l) => l.id}
        ListEmptyComponent={
          <Card>
            <Body muted>No entries today yet. Log your first client from the previous screen.</Body>
          </Card>
        }
        renderItem={({ item }) => {
          const mins = Math.max(0, differenceInMinutes(parseISO(item.endISO), parseISO(item.startISO)));
          return (
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <H3 style={{ marginBottom: 2 }}>{item.clientName}</H3>
                  <Body muted>
                    {item.serviceName} · {format(parseISO(item.startISO), 'HH:mm')}–
                    {format(parseISO(item.endISO), 'HH:mm')} · {formatMinutes(mins)}
                  </Body>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Body style={{ fontWeight: '700' }}>${item.servicePrice.toFixed(2)}</Body>
                  <Pressable onPress={() => confirmDelete(item.id)} hitSlop={10}>
                    <Body style={{ color: theme.colors.danger, marginTop: 6 }}>Remove</Body>
                  </Pressable>
                </View>
              </Row>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
