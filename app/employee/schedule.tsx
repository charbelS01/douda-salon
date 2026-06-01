import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { format, isSameDay, parseISO } from 'date-fns';
import { Body, Card, H1, Pill, Row, Screen } from '../../src/components/UI';
import { getAppointments, getSession } from '../../src/store/store';
import { Appointment, Session } from '../../src/types';
import { theme } from '../../src/theme';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am - 8pm
const HOUR_HEIGHT = 64;

function formatHourLabel(h: number): string {
  if (h === 0 || h === 12) return h === 0 ? '12 AM' : '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

interface LayoutedAppt {
  appt: Appointment;
  top: number;
  height: number;
  column: number;
  totalColumns: number;
}

function layoutAppointments(appts: Appointment[]): LayoutedAppt[] {
  if (appts.length === 0) return [];
  const items = appts.map((appt) => {
    const t = parseISO(appt.timeISO);
    const startMin = t.getHours() * 60 + t.getMinutes();
    const endMin = startMin + 55;
    const top = ((t.getHours() - 7) * HOUR_HEIGHT) + ((t.getMinutes() / 60) * HOUR_HEIGHT);
    return { appt, startMin, endMin, top, height: HOUR_HEIGHT * 0.9, column: 0, totalColumns: 1 };
  });
  items.sort((a, b) => a.startMin - b.startMin);

  const groups: (typeof items)[] = [];
  let current: typeof items = [];
  for (const item of items) {
    if (current.length === 0) { current.push(item); continue; }
    const overlaps = current.some((g) => item.startMin < g.endMin && item.endMin > g.startMin);
    if (overlaps) current.push(item);
    else { groups.push(current); current = [item]; }
  }
  if (current.length > 0) groups.push(current);

  const result: LayoutedAppt[] = [];
  for (const group of groups) {
    const columns: (typeof items[0])[][] = [];
    for (const item of group) {
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        if (item.startMin >= columns[c][columns[c].length - 1].endMin) {
          columns[c].push(item); item.column = c; placed = true; break;
        }
      }
      if (!placed) { item.column = columns.length; columns.push([item]); }
    }
    const total = columns.length;
    for (const item of group) {
      result.push({ appt: item.appt, top: Math.max(item.top, 0), height: item.height, column: item.column, totalColumns: total });
    }
  }
  return result;
}

export default function EmployeeSchedule() {
  const [session, setSessionState] = useState<Session | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const reload = useCallback(async () => {
    const s = await getSession();
    if (!s || s.role !== 'employee') { router.replace('/login'); return; }
    setSessionState(s);
    setAppointments(await getAppointments());
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const today = new Date();
  const dayAppts = appointments
    .filter((a) => a.employeeId === session?.employeeId && isSameDay(parseISO(a.dateISO), today))
    .sort((a, b) => a.timeISO.localeCompare(b.timeISO));
  const layouted = layoutAppointments(dayAppts);

  return (
    <Screen style={{ padding: 0 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xxl, paddingHorizontal: 16, paddingTop: 16 }}>
        <Pill label={session?.employeeName ?? ''} />
        <View style={{ height: theme.spacing.sm }} />
        <H1>My schedule</H1>
        <Body muted>{format(today, 'EEEE, MMMM d')}</Body>
        <Body muted style={{ marginTop: 4 }}>
          {dayAppts.length === 0
            ? 'No appointments today.'
            : `${dayAppts.length} appointment${dayAppts.length > 1 ? 's' : ''} today`}
        </Body>
        <View style={{ height: theme.spacing.lg }} />

        {/* Timeline */}
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 52 }}>
            {HOURS.map((h) => (
              <View key={h} style={{ height: HOUR_HEIGHT }}>
                <Body style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: -6 }}>
                  {formatHourLabel(h)}
                </Body>
              </View>
            ))}
          </View>

          <View style={{ flex: 1, position: 'relative' }}>
            {HOURS.map((h) => (
              <View key={h} style={{ height: HOUR_HEIGHT, borderTopWidth: 1, borderTopColor: theme.colors.border }} />
            ))}

            {/* Current time indicator */}
            {(() => {
              const now = new Date();
              const top = (now.getHours() - 7) * HOUR_HEIGHT + (now.getMinutes() / 60) * HOUR_HEIGHT;
              if (top < 0 || top > HOURS.length * HOUR_HEIGHT) return null;
              return (
                <View style={{ position: 'absolute', top, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 10 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#E74C3C' }} />
                  <View style={{ flex: 1, height: 2, backgroundColor: '#E74C3C' }} />
                </View>
              );
            })()}

            {/* Appointment blocks */}
            {layouted.map((item) => {
              const wp = 100 / item.totalColumns;
              const lp = item.column * wp;
              return (
                <View
                  key={item.appt.id}
                  style={{
                    position: 'absolute',
                    top: item.top,
                    left: `${lp + 1}%` as any,
                    width: `${wp - 2}%` as any,
                    height: item.height,
                    backgroundColor: theme.colors.primary,
                    borderRadius: 6,
                    padding: 6,
                    borderLeftWidth: 3,
                    borderLeftColor: 'rgba(0,0,0,0.2)',
                    zIndex: 5,
                  }}
                >
                  <Body style={{ color: '#fff', fontWeight: '700', fontSize: 12 }} numberOfLines={1}>
                    {format(parseISO(item.appt.timeISO), 'h:mm a')} {item.appt.clientName}
                  </Body>
                  <Body style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10 }} numberOfLines={1}>
                    {item.appt.serviceName}
                  </Body>
                  {item.appt.notes ? (
                    <Body style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontStyle: 'italic' }} numberOfLines={1}>
                      {item.appt.notes}
                    </Body>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        {/* List below */}
        {dayAppts.length > 0 && (
          <View style={{ marginTop: theme.spacing.lg }}>
            {dayAppts.map((a) => (
              <Card key={a.id}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Body style={{ fontWeight: '700' }}>{a.clientName}</Body>
                  <Body style={{ color: theme.colors.primary, fontWeight: '700' }}>
                    {format(parseISO(a.timeISO), 'h:mm a')}
                  </Body>
                </Row>
                <Body muted style={{ fontSize: 13 }}>{a.categoryName} · {a.serviceName}</Body>
                {a.notes ? <Body muted style={{ fontSize: 12, fontStyle: 'italic' }}>{a.notes}</Body> : null}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
