import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View, TextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { format, isSameDay, parseISO, addDays, subDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
let Notifications: any = null;
try { Notifications = require('expo-notifications'); } catch {}
import {
  Body, Button, Card, ConfirmModal, Field, H2, H3, Row, Screen,
} from '../../src/components/UI';
import {
  addAppointment, deleteAppointment, getAppointments,
  getCategories, getEmployees, getServices,
} from '../../src/store/store';
import { Appointment, Employee, Service, ServiceCategory } from '../../src/types';
import { theme } from '../../src/theme';

if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {}
}

async function requestNotificationPermissions() {
  if (!Notifications) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') await Notifications.requestPermissionsAsync();
  } catch {}
}

async function scheduleReminder(appt: Appointment) {
  if (!Notifications) return;
  try {
    const apptTime = parseISO(appt.timeISO);
    const reminderTime = new Date(apptTime.getTime() - 15 * 60 * 1000);
    if (reminderTime <= new Date()) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Upcoming: ${appt.clientName}`,
        body: `${appt.employeeName} has ${appt.serviceName} (${appt.categoryName}) in 15 minutes`,
      },
      trigger: { date: reminderTime } as any,
    });
  } catch {}
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00
const HOUR_HEIGHT = 64;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatHourLabel(h: number): string {
  if (h === 0 || h === 12) return h === 0 ? '12 AM' : '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

const APPT_COLORS = [
  '#B5476B', '#3FA67E', '#D4894A', '#5B7BB4', '#9B59B6',
  '#E74C3C', '#1ABC9C', '#F39C12',
];

function getApptColor(employeeId: string): string {
  let hash = 0;
  for (let i = 0; i < employeeId.length; i++) hash = ((hash << 5) - hash) + employeeId.charCodeAt(i);
  return APPT_COLORS[Math.abs(hash) % APPT_COLORS.length];
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
  let currentGroup: typeof items = [];

  for (const item of items) {
    if (currentGroup.length === 0) {
      currentGroup.push(item);
      continue;
    }
    const overlaps = currentGroup.some((g) => item.startMin < g.endMin && item.endMin > g.startMin);
    if (overlaps) {
      currentGroup.push(item);
    } else {
      groups.push(currentGroup);
      currentGroup = [item];
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  const result: LayoutedAppt[] = [];
  for (const group of groups) {
    const columns: (typeof items[0])[][] = [];
    for (const item of group) {
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        const lastInCol = columns[c][columns[c].length - 1];
        if (item.startMin >= lastInCol.endMin) {
          columns[c].push(item);
          item.column = c;
          placed = true;
          break;
        }
      }
      if (!placed) {
        item.column = columns.length;
        columns.push([item]);
      }
    }
    const totalColumns = columns.length;
    for (const item of group) {
      item.totalColumns = totalColumns;
      result.push({
        appt: item.appt,
        top: Math.max(item.top, 0),
        height: item.height,
        column: item.column,
        totalColumns,
      });
    }
  }

  return result;
}

export default function Calendar() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [clientName, setClientName] = useState('');
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [apptDate, setApptDate] = useState(new Date());
  const [apptTime, setApptTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Appointment | null>(null);

  const reload = useCallback(async () => {
    setAppointments(await getAppointments());
    setEmployees(await getEmployees());
    setCategories(await getCategories());
    setServices(await getServices());
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  useEffect(() => { requestNotificationPermissions(); }, []);
  useEffect(() => { setServiceId(null); }, [categoryId]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const filteredServices = services.filter((s) => s.categoryId === categoryId);
  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedService = services.find((s) => s.id === serviceId);
  const isOther = selectedCategory?.id === 'cat_other';

  const dayAppointments = appointments
    .filter((a) => isSameDay(parseISO(a.dateISO), selectedDate))
    .sort((a, b) => a.timeISO.localeCompare(b.timeISO));

  const layouted = layoutAppointments(dayAppointments);

  async function submit() {
    setFormError(null);
    if (!clientName.trim()) return setFormError('Please enter the client name');
    if (!employeeId || !selectedEmployee) return setFormError('Please select an employee');
    if (!categoryId || !selectedCategory) return setFormError('Please select a category');
    if (!serviceId || !selectedService) return setFormError('Please pick a service');

    setBusy(true);
    try {
      const timeDate = new Date(apptDate);
      timeDate.setHours(apptTime.getHours(), apptTime.getMinutes(), 0, 0);

      const appt = await addAppointment({
        clientName: clientName.trim(),
        employeeId,
        employeeName: selectedEmployee.name,
        serviceId,
        serviceName: selectedService.name,
        categoryId,
        categoryName: selectedCategory.name,
        dateISO: timeDate.toISOString(),
        timeISO: timeDate.toISOString(),
        notes: notes.trim() || undefined,
      });
      try { await scheduleReminder(appt); } catch {}
      setClientName('');
      setNotes('');
      setEmployeeId(null);
      setCategoryId(null);
      setServiceId(null);
      setShowForm(false);
      setSelectedDate(timeDate);
      reload();
    } catch (e: any) {
      setFormError(e?.message ?? 'Could not save appointment');
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(a: Appointment) {
    setPendingDelete(a);
  }

  const today = new Date();

  return (
    <Screen style={{ padding: 0 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        {/* Week header bar */}
        <View style={{ backgroundColor: theme.colors.card, paddingTop: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
          {/* Month + nav */}
          <Row style={{ justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }}>
            <Pressable onPress={() => setWeekStart(w => subWeeks(w, 1))} hitSlop={12}>
              <Body style={{ fontSize: 22, color: theme.colors.primary, fontWeight: '700' }}>‹</Body>
            </Pressable>
            <Pressable onPress={() => { setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 })); setSelectedDate(new Date()); }}>
              <H2 style={{ marginBottom: 0 }}>{format(weekStart, 'MMMM yyyy')}</H2>
            </Pressable>
            <Pressable onPress={() => setWeekStart(w => addWeeks(w, 1))} hitSlop={12}>
              <Body style={{ fontSize: 22, color: theme.colors.primary, fontWeight: '700' }}>›</Body>
            </Pressable>
          </Row>

          {/* Day chips */}
          <Row style={{ justifyContent: 'space-around', paddingHorizontal: 4 }}>
            {weekDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);
              const hasAppts = appointments.some((a) => isSameDay(parseISO(a.dateISO), day));
              return (
                <Pressable
                  key={day.toISOString()}
                  onPress={() => setSelectedDate(day)}
                  style={{
                    alignItems: 'center', paddingVertical: 6, paddingHorizontal: 6,
                    borderRadius: 12, minWidth: 44,
                    backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                  }}
                >
                  <Body style={{
                    fontSize: 11, fontWeight: '600',
                    color: isSelected ? '#fff' : theme.colors.textMuted,
                    marginBottom: 2,
                  }}>
                    {DAY_NAMES[day.getDay()]}
                  </Body>
                  <View style={{
                    width: 32, height: 32, borderRadius: 16,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : isToday ? theme.colors.accent : 'transparent',
                  }}>
                    <Body style={{
                      fontSize: 15, fontWeight: '700',
                      color: isSelected ? '#fff' : isToday ? theme.colors.primaryDark : theme.colors.text,
                    }}>
                      {format(day, 'd')}
                    </Body>
                  </View>
                  {hasAppts && !isSelected && (
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: theme.colors.primary, marginTop: 2 }} />
                  )}
                  {!hasAppts && !isSelected && <View style={{ width: 5, height: 5, marginTop: 2 }} />}
                </Pressable>
              );
            })}
          </Row>
        </View>

        {/* Selected day label + add button */}
        <Row style={{ justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
          <View>
            <Body style={{ fontWeight: '700', fontSize: 16 }}>{format(selectedDate, 'EEEE, MMM d')}</Body>
            <Body muted style={{ fontSize: 12 }}>
              {dayAppointments.length === 0
                ? 'No appointments'
                : `${dayAppointments.length} appointment${dayAppointments.length > 1 ? 's' : ''}`}
            </Body>
          </View>
          {!showForm && (
            <Pressable
              onPress={() => { setApptDate(selectedDate); setFormError(null); setShowForm(true); }}
              style={{
                backgroundColor: theme.colors.primary,
                paddingHorizontal: 14, paddingVertical: 8,
                borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4,
              }}
            >
              <Body style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: -1 }}>+</Body>
              <Body style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>New</Body>
            </Pressable>
          )}
        </Row>

        {/* Inline add form (above timeline for quick access) */}
        {showForm && (
          <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 }}>
            <Card>
              <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                <H2 style={{ marginBottom: 0 }}>New appointment</H2>
                <Pressable onPress={() => setShowForm(false)} hitSlop={10}>
                  <Body style={{ color: theme.colors.primary, fontWeight: '700' }}>Cancel</Body>
                </Pressable>
              </Row>

              <Field label="Client name" value={clientName} onChangeText={setClientName} placeholder="e.g. Marie" />

              <Body style={{ marginBottom: theme.spacing.xs, fontWeight: '600' }}>Employee</Body>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md }}>
                {employees.map((e) => {
                  const active = e.id === employeeId;
                  return (
                    <Pressable key={e.id} onPress={() => setEmployeeId(e.id)} style={chipStyle(active)}>
                      <Body style={{ color: active ? '#fff' : theme.colors.text, fontWeight: '600' }}>{e.name}</Body>
                    </Pressable>
                  );
                })}
              </View>

              <Body style={{ marginBottom: theme.spacing.xs, fontWeight: '600' }}>Category</Body>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md }}>
                {categories.map((c) => {
                  const active = c.id === categoryId;
                  return (
                    <Pressable key={c.id} onPress={() => setCategoryId(c.id)} style={chipStyle(active)}>
                      <Body style={{ color: active ? '#fff' : theme.colors.text, fontWeight: '600' }}>{c.name}</Body>
                    </Pressable>
                  );
                })}
              </View>

              {categoryId && (
                <>
                  <Body style={{ marginBottom: theme.spacing.xs, fontWeight: '600' }}>Service</Body>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md }}>
                    {filteredServices.map((s) => {
                      const active = s.id === serviceId;
                      return (
                        <Pressable key={s.id} onPress={() => setServiceId(s.id)} style={chipStyle(active)}>
                          <Body style={{ color: active ? '#fff' : theme.colors.text, fontWeight: '600' }}>{s.name}</Body>
                        </Pressable>
                      );
                    })}
                    {filteredServices.length === 0 && <Body muted>No services in this category.</Body>}
                  </View>
                </>
              )}

              <Row style={{ gap: theme.spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Body style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>Date</Body>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={format(apptDate, 'yyyy-MM-dd')}
                      onChange={(e) => {
                        const v = (e.target as HTMLInputElement).value;
                        if (v) setApptDate(new Date(v + 'T00:00:00'));
                      }}
                      style={nativeInputStyle as any}
                    />
                  ) : (
                    <>
                      <Pressable onPress={() => setShowDatePicker(true)} style={pickerBoxStyle}>
                        <Body>{format(apptDate, 'EEE, d MMM yyyy')}</Body>
                      </Pressable>
                      {showDatePicker && (
                        <>
                          <DateTimePicker
                            value={apptDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(_, d) => {
                              if (Platform.OS !== 'ios') setShowDatePicker(false);
                              if (d) setApptDate(d);
                            }}
                          />
                          {Platform.OS === 'ios' && (
                            <Button title="Done" variant="ghost" onPress={() => setShowDatePicker(false)} />
                          )}
                        </>
                      )}
                    </>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Body style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>Time</Body>
                  {Platform.OS === 'web' ? (
                    <input
                      type="time"
                      value={format(apptTime, 'HH:mm')}
                      onChange={(e) => {
                        const v = (e.target as HTMLInputElement).value;
                        if (v) {
                          const [h, m] = v.split(':').map(Number);
                          const d = new Date(apptTime);
                          d.setHours(h, m, 0, 0);
                          setApptTime(d);
                        }
                      }}
                      style={nativeInputStyle as any}
                    />
                  ) : (
                    <>
                      <Pressable onPress={() => setShowTimePicker(true)} style={pickerBoxStyle}>
                        <Body>{format(apptTime, 'h:mm a')}</Body>
                      </Pressable>
                      {showTimePicker && (
                        <>
                          <DateTimePicker
                            value={apptTime}
                            mode="time"
                            is24Hour={false}
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(_, date) => {
                              if (Platform.OS !== 'ios') setShowTimePicker(false);
                              if (date) setApptTime(date);
                            }}
                          />
                          {Platform.OS === 'ios' && (
                            <Button title="Done" variant="ghost" onPress={() => setShowTimePicker(false)} />
                          )}
                        </>
                      )}
                    </>
                  )}
                </View>
              </Row>

              <Field label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder={isOther ? 'Describe the service...' : 'e.g. prefers gel-X'} multiline={isOther} numberOfLines={isOther ? 3 : 1} />

              {formError && (
                <Body style={{ color: theme.colors.danger, marginBottom: theme.spacing.sm, fontWeight: '600' }}>
                  {formError}
                </Body>
              )}
              <Button title="Add appointment" onPress={submit} loading={busy} />
              <Body muted style={{ marginTop: theme.spacing.sm, textAlign: 'center', fontSize: 12 }}>
                A reminder will be sent 15 min before the appointment.
              </Body>
            </Card>
          </View>
        )}

        {/* Timeline view */}
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row' }}>
            {/* Hour labels */}
            <View style={{ width: 52 }}>
              {HOURS.map((h) => (
                <View key={h} style={{ height: HOUR_HEIGHT, justifyContent: 'flex-start' }}>
                  <Body style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: -6 }}>
                    {formatHourLabel(h)}
                  </Body>
                </View>
              ))}
            </View>

            {/* Grid + appointments */}
            <View style={{ flex: 1, position: 'relative' }}>
              {/* Hour grid lines */}
              {HOURS.map((h) => (
                <View
                  key={h}
                  style={{
                    height: HOUR_HEIGHT,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                  }}
                />
              ))}

              {/* Current time indicator */}
              {isSameDay(selectedDate, today) && (() => {
                const now = new Date();
                const nowTop = (now.getHours() - 7) * HOUR_HEIGHT + (now.getMinutes() / 60) * HOUR_HEIGHT;
                if (nowTop < 0 || nowTop > HOURS.length * HOUR_HEIGHT) return null;
                return (
                  <View style={{
                    position: 'absolute', top: nowTop, left: 0, right: 0,
                    flexDirection: 'row', alignItems: 'center', zIndex: 10,
                  }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#E74C3C' }} />
                    <View style={{ flex: 1, height: 2, backgroundColor: '#E74C3C' }} />
                  </View>
                );
              })()}

              {/* Appointment blocks with overlap handling */}
              {layouted.map((item) => {
                const color = getApptColor(item.appt.employeeId);
                const widthPercent = 100 / item.totalColumns;
                const leftPercent = item.column * widthPercent;
                return (
                  <Pressable
                    key={item.appt.id}
                    onPress={() => confirmDelete(item.appt)}
                    style={{
                      position: 'absolute',
                      top: item.top,
                      left: `${leftPercent + 1}%` as any,
                      width: `${widthPercent - 2}%` as any,
                      height: item.height,
                      backgroundColor: color,
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
                      {item.appt.employeeName} · {item.appt.serviceName}
                    </Body>
                    {item.appt.notes ? (
                      <Body style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontStyle: 'italic' }} numberOfLines={1}>
                        {item.appt.notes}
                      </Body>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {dayAppointments.length === 0 && !showForm && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <Body muted style={{ textAlign: 'center' }}>No appointments for this day. Tap + New to add one.</Body>
          </View>
        )}

        {/* Appointment list summary below timeline */}
        {dayAppointments.length > 0 && !showForm && (
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <Body muted style={{ fontSize: 12, marginBottom: 8, textAlign: 'center' }}>
              Tap any appointment to cancel it
            </Body>
            {dayAppointments.map((a) => (
              <Pressable key={a.id} onPress={() => confirmDelete(a)}>
                <Card>
                  <Row style={{ gap: 10 }}>
                    <View style={{ width: 4, borderRadius: 2, backgroundColor: getApptColor(a.employeeId), alignSelf: 'stretch' }} />
                    <View style={{ flex: 1 }}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Body style={{ fontWeight: '700' }}>{a.clientName}</Body>
                        <Body style={{ color: theme.colors.primary, fontWeight: '700' }}>
                          {format(parseISO(a.timeISO), 'h:mm a')}
                        </Body>
                      </Row>
                      <Body muted style={{ fontSize: 13 }}>{a.employeeName} · {a.categoryName} · {a.serviceName}</Body>
                      {a.notes ? <Body muted style={{ fontSize: 12, fontStyle: 'italic' }}>{a.notes}</Body> : null}
                    </View>
                  </Row>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <ConfirmModal
        visible={!!pendingDelete}
        title="Cancel appointment?"
        message={pendingDelete ? `${pendingDelete.clientName} — ${pendingDelete.serviceName}` : ''}
        confirmLabel="Cancel it"
        cancelLabel="Keep"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await deleteAppointment(pendingDelete.id);
          setPendingDelete(null);
          reload();
        }}
      />
    </Screen>
  );
}

function chipStyle(active: boolean) {
  return {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 999,
    backgroundColor: active ? theme.colors.primary : theme.colors.bg,
    borderWidth: 1,
    borderColor: active ? theme.colors.primary : theme.colors.border,
  };
}

const nativeInputStyle = {
  backgroundColor: theme.colors.bg,
  borderRadius: theme.radius.md,
  paddingHorizontal: theme.spacing.md,
  paddingVertical: theme.spacing.md,
  borderWidth: 1,
  borderColor: theme.colors.border,
  fontSize: 16,
  color: theme.colors.text,
  marginBottom: theme.spacing.md,
  width: '100%',
  boxSizing: 'border-box',
};

const pickerBoxStyle = {
  backgroundColor: theme.colors.bg,
  borderRadius: theme.radius.md,
  paddingHorizontal: theme.spacing.md,
  paddingVertical: theme.spacing.md,
  borderWidth: 1,
  borderColor: theme.colors.border,
  marginBottom: theme.spacing.md,
};
