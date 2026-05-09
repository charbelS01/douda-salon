import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Body, Button, Card, Field, H2, Pill, Row, Screen } from '../../src/components/UI';
import {
  addLog,
  getServices,
  getSession,
} from '../../src/store/store';
import { Service, Session } from '../../src/types';
import { theme } from '../../src/theme';

function combine(date: Date, time: Date): Date {
  const d = new Date(date);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}

export default function LogClient() {
  const [session, setSessionState] = useState<Session | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [clientName, setClientName] = useState('');
  const [serviceId, setServiceId] = useState<string | null>(null);
  const today = new Date();
  const [start, setStart] = useState<Date>(new Date(today.getTime() - 60 * 60 * 1000));
  const [end, setEnd] = useState<Date>(today);
  const [picker, setPicker] = useState<null | 'start' | 'end'>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const s = await getSession();
    if (!s || s.role !== 'employee') {
      router.replace('/login');
      return;
    }
    setSessionState(s);
    setServices(await getServices());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  useEffect(() => {
    if (services.length && !serviceId) setServiceId(services[0].id);
  }, [services, serviceId]);

  async function submit() {
    if (!session?.employeeId) return;
    if (!clientName.trim()) return Alert.alert('Please enter the client name');
    if (!serviceId) return Alert.alert('Please pick a service');
    if (end <= start) return Alert.alert('End time must be after start time');
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;

    setBusy(true);
    try {
      await addLog({
        employeeId: session.employeeId,
        employeeName: session.employeeName ?? 'Unknown',
        clientName: clientName.trim(),
        serviceId: svc.id,
        serviceName: svc.name,
        servicePrice: svc.price,
        startISO: start.toISOString(),
        endISO: end.toISOString(),
      });
      setClientName('');
      Alert.alert('Saved', `${svc.name} for ${clientName.trim()} logged.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Pill label={session?.employeeName ?? ''} />
        <View style={{ height: theme.spacing.md }} />

        <Card>
          <H2>New entry</H2>
          <Field label="Client name" value={clientName} onChangeText={setClientName} placeholder="e.g. Marie" />

          <Body style={{ marginBottom: theme.spacing.xs, fontWeight: '600' }}>Service</Body>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md }}>
            {services.map((s) => {
              const active = s.id === serviceId;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setServiceId(s.id)}
                  style={{
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                    borderRadius: 999,
                    backgroundColor: active ? theme.colors.primary : theme.colors.bg,
                    borderWidth: 1,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  }}
                >
                  <Body style={{ color: active ? '#fff' : theme.colors.text, fontWeight: '600' }}>
                    {s.name} · ${s.price}
                  </Body>
                </Pressable>
              );
            })}
            {services.length === 0 && <Body muted>No services yet — ask the owner to add some.</Body>}
          </View>

          <Row style={{ gap: theme.spacing.md }}>
            <View style={{ flex: 1 }}>
              <Body style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>Start</Body>
              <Pressable onPress={() => setPicker('start')} style={pickerBoxStyle}>
                <Body>{format(start, 'EEE d MMM · HH:mm')}</Body>
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <Body style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>End</Body>
              <Pressable onPress={() => setPicker('end')} style={pickerBoxStyle}>
                <Body>{format(end, 'EEE d MMM · HH:mm')}</Body>
              </Pressable>
            </View>
          </Row>

          {picker && (
            <DateTimePicker
              value={picker === 'start' ? start : end}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                if (Platform.OS !== 'ios') setPicker(null);
                if (!date) return;
                if (picker === 'start') setStart(combine(start, date));
                else setEnd(combine(end, date));
              }}
            />
          )}
          {Platform.OS === 'ios' && picker && (
            <Button title="Done" variant="ghost" onPress={() => setPicker(null)} />
          )}

          <View style={{ height: theme.spacing.lg }} />
          <Button title="Save entry" onPress={submit} loading={busy} />
        </Card>

        <Link href="/employee/my-day" asChild>
          <Pressable>
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <View>
                  <H2 style={{ marginBottom: 0 }}>My day →</H2>
                  <Body muted>Review and remove entries you logged today.</Body>
                </View>
              </Row>
            </Card>
          </Pressable>
        </Link>
      </ScrollView>
    </Screen>
  );
}

const pickerBoxStyle = {
  backgroundColor: theme.colors.bg,
  borderRadius: theme.radius.md,
  paddingHorizontal: theme.spacing.md,
  paddingVertical: theme.spacing.md,
  borderWidth: 1,
  borderColor: theme.colors.border,
};
