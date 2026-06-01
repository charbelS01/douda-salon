import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Body, Button, Card, Field, H2, Pill, Row, Screen } from '../../src/components/UI';
import {
  addLog,
  getCategories,
  getServices,
  getSession,
} from '../../src/store/store';
import { PaymentMethod, Service, ServiceCategory, Session } from '../../src/types';
import { theme } from '../../src/theme';

export default function LogClient() {
  const [session, setSessionState] = useState<Session | null>(null);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clientName, setClientName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [colorCode, setColorCode] = useState('');
  const [otherNotes, setOtherNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const s = await getSession();
    if (!s || s.role !== 'employee') {
      router.replace('/login');
      return;
    }
    setSessionState(s);
    setCategories(await getCategories());
    setServices(await getServices());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;
  const filteredServices = services.filter((s) => s.categoryId === categoryId);
  const selectedService = services.find((s) => s.id === serviceId) ?? null;
  const isNailRelated = selectedCategory?.isNailRelated ?? false;
  const isOther = selectedCategory?.id === 'cat_other';

  useEffect(() => {
    setServiceId(null);
    setColorCode('');
    setOtherNotes('');
  }, [categoryId]);

  async function submit() {
    if (!session?.employeeId) return;
    if (!clientName.trim()) return Alert.alert('Please enter the client name');
    if (!categoryId || !selectedCategory) return Alert.alert('Please select a category');
    if (!serviceId || !selectedService) return Alert.alert('Please pick a service');
    const paid = Number(amountPaid);
    if (!amountPaid.trim() || !Number.isFinite(paid) || paid < 0) return Alert.alert('Please enter a valid amount paid');

    const now = new Date();
    const start = new Date(now.getTime() - 60 * 60 * 1000);
    setBusy(true);
    try {
      await addLog({
        employeeId: session.employeeId,
        employeeName: session.employeeName ?? 'Unknown',
        clientName: clientName.trim(),
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        amountPaid: paid,
        paymentMethod,
        colorCode: isNailRelated && colorCode.trim() ? colorCode.trim() : undefined,
        notes: isOther && otherNotes.trim() ? otherNotes.trim() : undefined,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        startISO: start.toISOString(),
        endISO: now.toISOString(),
      });
      setClientName('');
      setAmountPaid('');
      setPaymentMethod('cash');
      setColorCode('');
      setOtherNotes('');
      Alert.alert('Saved', `${selectedService.name} for ${clientName.trim()} logged.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Pill label={session?.employeeName ?? ''} />
        <View style={{ height: theme.spacing.md }} />

        <Pressable onPress={() => router.push('/employee/schedule')}>
          <Card>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <H2 style={{ marginBottom: 0 }}>My schedule today ›</H2>
                <Body muted>See appointments the owner booked for you.</Body>
              </View>
            </Row>
          </Card>
        </Pressable>

        <Card>
          <H2>New entry</H2>

          <Field label="Client name" value={clientName} onChangeText={setClientName} placeholder="e.g. Marie" />

          {/* Category selector */}
          <Body style={{ marginBottom: theme.spacing.xs, fontWeight: '600' }}>Category</Body>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md }}>
            {categories.map((c) => {
              const active = c.id === categoryId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
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
                    {c.name}
                  </Body>
                </Pressable>
              );
            })}
          </View>

          {/* Service selector (no price shown) */}
          {categoryId && (
            <>
              <Body style={{ marginBottom: theme.spacing.xs, fontWeight: '600' }}>Service</Body>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md }}>
                {filteredServices.map((s) => {
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
                        {s.name}
                      </Body>
                    </Pressable>
                  );
                })}
                {filteredServices.length === 0 && <Body muted>No services in this category.</Body>}
              </View>
            </>
          )}

          {/* Amount paid */}
          <Field
            label="Amount paid ($)"
            value={amountPaid}
            onChangeText={setAmountPaid}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />

          {/* Payment method */}
          <Body style={{ marginBottom: theme.spacing.xs, fontWeight: '600' }}>Payment method</Body>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md }}>
            {(['cash', 'whish'] as PaymentMethod[]).map((m) => {
              const active = m === paymentMethod;
              return (
                <Pressable
                  key={m}
                  onPress={() => setPaymentMethod(m)}
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
                    {m === 'cash' ? 'Cash' : 'Whish'}
                  </Body>
                </Pressable>
              );
            })}
          </View>

          {/* Color code for nail services */}
          {isNailRelated && (
            <Field
              label="Color code"
              value={colorCode}
              onChangeText={setColorCode}
              placeholder="e.g. OPI #A16"
            />
          )}

          {/* Notes for Other category */}
          {isOther && (
            <Field
              label="Notes"
              value={otherNotes}
              onChangeText={setOtherNotes}
              placeholder="Describe the service..."
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          )}

          <View style={{ height: theme.spacing.lg }} />
          <Button title="Save entry" onPress={submit} loading={busy} />
        </Card>

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
