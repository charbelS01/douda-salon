import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { addDays, differenceInMinutes, format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { Body, Button, Card, ConfirmModal, H1, H2, H3, Pill, Row, Screen } from '../../src/components/UI';
import { deleteLog, getEmployees, getLogs, getSession } from '../../src/store/store';
import { Employee, WorkLog } from '../../src/types';
import { theme } from '../../src/theme';
import { formatMinutes } from '../../src/store/summary';

const dateBtn = {
  backgroundColor: theme.colors.bg,
  borderRadius: theme.radius.md,
  paddingHorizontal: theme.spacing.md,
  paddingVertical: theme.spacing.md,
  borderWidth: 1,
  borderColor: theme.colors.border,
  alignItems: 'center' as const,
};

export default function EmployeeLogsScreen() {
  const { employeeId } = useLocalSearchParams<{ employeeId?: string }>();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(employeeId ?? null);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [day, setDay] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<WorkLog | null>(null);

  const reload = useCallback(async () => {
    const s = await getSession();
    if (!s || s.role !== 'admin') {
      router.replace('/login');
      return;
    }
    const emps = await getEmployees();
    setEmployees(emps);
    setLogs(await getLogs());
    if (!selectedId && emps.length > 0) setSelectedId(emps[0].id);
  }, [selectedId]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const dayLogs = logs
    .filter((l) => l.employeeId === selectedId && isSameDay(parseISO(l.startISO), day))
    .sort((a, b) => a.startISO.localeCompare(b.startISO));

  const totalIncome = dayLogs.reduce((a, l) => a + (l.amountPaid ?? l.servicePrice), 0);
  const totalMinutes = dayLogs.reduce(
    (a, l) => a + Math.max(0, differenceInMinutes(parseISO(l.endISO), parseISO(l.startISO))),
    0,
  );
  const cash = dayLogs.filter((l) => (l.paymentMethod ?? 'cash') === 'cash').reduce((a, l) => a + (l.amountPaid ?? l.servicePrice), 0);
  const whish = dayLogs.filter((l) => l.paymentMethod === 'whish').reduce((a, l) => a + (l.amountPaid ?? l.servicePrice), 0);

  const selectedEmployee = employees.find((e) => e.id === selectedId);


  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}>
        <Pill label="Owner" />
        <View style={{ height: theme.spacing.sm }} />
        <H1>Employee day</H1>
        <Body muted>Review and remove logged services for a specific employee and date.</Body>
        <View style={{ height: theme.spacing.lg }} />

        {/* Employee picker */}
        <Body style={{ marginBottom: theme.spacing.xs, fontWeight: '600' }}>Employee</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md }}>
          {employees.map((e) => {
            const active = e.id === selectedId;
            return (
              <Pressable
                key={e.id}
                onPress={() => setSelectedId(e.id)}
                style={{
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: 999,
                  backgroundColor: active ? theme.colors.primary : theme.colors.bg,
                  borderWidth: 1,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                }}
              >
                <Body style={{ color: active ? '#fff' : theme.colors.text, fontWeight: '600' }}>{e.name}</Body>
              </Pressable>
            );
          })}
        </View>

        {/* Date navigator */}
        <Body style={{ marginBottom: theme.spacing.xs, fontWeight: '600' }}>Date</Body>
        <Row style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
          <Pressable onPress={() => setDay(addDays(day, -1))} style={dateBtn}>
            <Body style={{ fontWeight: '700' }}>‹</Body>
          </Pressable>
          <Pressable onPress={() => setShowPicker(true)} style={[dateBtn, { flex: 1 }]}>
            <Body>{format(day, 'EEE, d MMM yyyy')}</Body>
          </Pressable>
          <Pressable onPress={() => setDay(addDays(day, 1))} style={dateBtn}>
            <Body style={{ fontWeight: '700' }}>›</Body>
          </Pressable>
          <Pressable onPress={() => setDay(startOfDay(new Date()))} style={dateBtn}>
            <Body style={{ fontWeight: '600' }}>Today</Body>
          </Pressable>
        </Row>
        {showPicker && Platform.OS === 'web' && (
          <input
            type="date"
            value={format(day, 'yyyy-MM-dd')}
            onChange={(e) => {
              const v = (e.target as HTMLInputElement).value;
              if (v) setDay(new Date(v + 'T00:00:00'));
              setShowPicker(false);
            }}
            onBlur={() => setShowPicker(false)}
            autoFocus
            style={{
              padding: 12,
              marginBottom: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.colors.border,
              fontSize: 16,
            } as any}
          />
        )}
        {showPicker && Platform.OS !== 'web' && (
          <>
            <DateTimePicker
              value={day}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                if (Platform.OS !== 'ios') setShowPicker(false);
                if (d) setDay(d);
              }}
            />
            {Platform.OS === 'ios' && (
              <Button title="Done" variant="ghost" onPress={() => setShowPicker(false)} />
            )}
          </>
        )}

        {/* Day summary */}
        <Card>
          <H2 style={{ marginBottom: theme.spacing.xs }}>
            {selectedEmployee?.name ?? 'No employee'} · {format(day, 'd MMM')}
          </H2>
          <Row style={{ justifyContent: 'space-between', paddingVertical: 2 }}>
            <Body muted>Income</Body>
            <Body style={{ fontWeight: '700' }}>${totalIncome.toFixed(2)}</Body>
          </Row>
          <Row style={{ justifyContent: 'space-between', paddingVertical: 2 }}>
            <Body muted>Cash · Whish</Body>
            <Body>${cash.toFixed(2)} · ${whish.toFixed(2)}</Body>
          </Row>
          <Row style={{ justifyContent: 'space-between', paddingVertical: 2 }}>
            <Body muted>Time worked · clients</Body>
            <Body>{formatMinutes(totalMinutes)} · {dayLogs.length}</Body>
          </Row>
        </Card>

        {/* Log list */}
        <H2>Entries</H2>
        {dayLogs.length === 0 ? (
          <Card><Body muted>No entries for this employee on this day.</Body></Card>
        ) : (
          dayLogs.map((l) => (
            <Card key={l.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <H3 style={{ marginBottom: 0 }}>{l.clientName}</H3>
                <Body style={{ fontWeight: '700' }}>${(l.amountPaid ?? l.servicePrice).toFixed(2)}</Body>
              </Row>
              <Body muted>
                {l.serviceName} · {l.categoryName} · {(l.paymentMethod ?? 'cash') === 'cash' ? 'Cash' : 'Whish'}
              </Body>
              <Body muted>
                {format(parseISO(l.startISO), 'h:mm a')} – {format(parseISO(l.endISO), 'h:mm a')}
              </Body>
              {l.colorCode && <Body muted>Color: {l.colorCode}</Body>}
              {l.notes && <Body muted>Notes: {l.notes}</Body>}
              <View style={{ height: theme.spacing.sm }} />
              <Button title="Remove entry" variant="danger" onPress={() => setPendingDelete(l)} />
            </Card>
          ))
        )}
      </ScrollView>
      <ConfirmModal
        visible={!!pendingDelete}
        title="Remove entry?"
        message={
          pendingDelete
            ? `${pendingDelete.serviceName} for ${pendingDelete.clientName} — $${(pendingDelete.amountPaid ?? pendingDelete.servicePrice).toFixed(2)}`
            : ''
        }
        confirmLabel="Remove"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await deleteLog(pendingDelete.id);
          setPendingDelete(null);
          reload();
        }}
      />
    </Screen>
  );
}
