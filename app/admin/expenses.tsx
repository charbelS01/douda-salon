import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { format, parseISO, subDays } from 'date-fns';
import { Body, Button, Card, ConfirmModal, Field, H1, H2, H3, Pill, Row, Screen } from '../../src/components/UI';
import { addExpense, deleteExpense, getExpenses, getLogs, getSession } from '../../src/store/store';
import { Expense, ExpenseCategory, PaymentMethod, WorkLog } from '../../src/types';
import { theme } from '../../src/theme';

const CATEGORIES: { id: ExpenseCategory; label: string }[] = [
  { id: 'salary', label: 'Salary' },
  { id: 'douda', label: 'Douda' },
  { id: 'institut', label: 'Institut' },
  { id: 'other', label: 'Other' },
];

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [category, setCategory] = useState<ExpenseCategory>('salary');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);

  const reload = useCallback(async () => {
    const s = await getSession();
    if (!s || s.role !== 'admin') {
      router.replace('/login');
      return;
    }
    setExpenses(await getExpenses());
    setLogs(await getLogs());
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  async function submit() {
    if (!label.trim()) return Alert.alert('Please enter a label');
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return Alert.alert('Please enter a valid amount');
    setBusy(true);
    try {
      await addExpense({
        category,
        label: label.trim(),
        amount: amt,
        paymentMethod,
        dateISO: new Date().toISOString(),
        notes: notes.trim() || undefined,
      });
      setLabel('');
      setAmount('');
      setNotes('');
      await reload();
    } finally {
      setBusy(false);
    }
  }


  // ---- Aggregations (last 30 days) ----
  const since = subDays(new Date(), 29);
  const recentExpenses = expenses.filter((e) => parseISO(e.dateISO) >= since);
  const recentLogs = logs.filter((l) => parseISO(l.startISO) >= since);

  const expByCat = CATEGORIES.map((c) => ({
    ...c,
    total: recentExpenses.filter((e) => e.category === c.id).reduce((a, e) => a + e.amount, 0),
  }));
  const expCash = recentExpenses.filter((e) => e.paymentMethod === 'cash').reduce((a, e) => a + e.amount, 0);
  const expWhish = recentExpenses.filter((e) => e.paymentMethod === 'whish').reduce((a, e) => a + e.amount, 0);
  const totalExpenses = expCash + expWhish;

  const incCash = recentLogs.filter((l) => (l.paymentMethod ?? 'cash') === 'cash').reduce((a, l) => a + (l.amountPaid ?? l.servicePrice), 0);
  const incWhish = recentLogs.filter((l) => l.paymentMethod === 'whish').reduce((a, l) => a + (l.amountPaid ?? l.servicePrice), 0);
  const totalIncome = incCash + incWhish;

  const netCash = incCash - expCash;
  const netWhish = incWhish - expWhish;
  const netTotal = totalIncome - totalExpenses;

  const sorted = [...expenses].sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Pill label="Owner" />
        <View style={{ height: theme.spacing.sm }} />
        <H1>Expenses</H1>
        <Body muted>Track salary, Douda, Institut and other expenses.</Body>
        <View style={{ height: theme.spacing.lg }} />

        {/* Net summary (30 days) */}
        <H2>Last 30 days</H2>
        <Row style={{ gap: theme.spacing.md }}>
          <Kpi label="Income" value={`$${totalIncome.toFixed(2)}`} />
          <Kpi label="Expenses" value={`$${totalExpenses.toFixed(2)}`} />
        </Row>
        <Kpi label="Net" value={`$${netTotal.toFixed(2)}`} color={netTotal >= 0 ? theme.colors.success : theme.colors.danger} />

        <Card>
          <H2>Cash vs Whish (30 days)</H2>
          <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
            <Body style={{ fontWeight: '600' }}>Cash</Body>
            <Body muted>in ${incCash.toFixed(2)} · out ${expCash.toFixed(2)}</Body>
          </Row>
          <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
            <Body muted>· Net cash on hand</Body>
            <Body style={{ fontWeight: '700', color: netCash >= 0 ? theme.colors.success : theme.colors.danger }}>
              ${netCash.toFixed(2)}
            </Body>
          </Row>
          <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.sm }} />
          <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
            <Body style={{ fontWeight: '600' }}>Whish</Body>
            <Body muted>in ${incWhish.toFixed(2)} · out ${expWhish.toFixed(2)}</Body>
          </Row>
          <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
            <Body muted>· Net Whish balance</Body>
            <Body style={{ fontWeight: '700', color: netWhish >= 0 ? theme.colors.success : theme.colors.danger }}>
              ${netWhish.toFixed(2)}
            </Body>
          </Row>
        </Card>

        <Card>
          <H2>Expenses by category (30 days)</H2>
          {expByCat.map((c) => (
            <Row key={c.id} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
              <Body>{c.label}</Body>
              <Body muted>${c.total.toFixed(2)}</Body>
            </Row>
          ))}
        </Card>

        {/* New expense */}
        <Card>
          <H2>Add expense</H2>

          <Body style={{ marginBottom: theme.spacing.xs, fontWeight: '600' }}>Category</Body>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md }}>
            {CATEGORIES.map((c) => {
              const active = c.id === category;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategory(c.id)}
                  style={{
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                    borderRadius: 999,
                    backgroundColor: active ? theme.colors.primary : theme.colors.bg,
                    borderWidth: 1,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  }}
                >
                  <Body style={{ color: active ? '#fff' : theme.colors.text, fontWeight: '600' }}>{c.label}</Body>
                </Pressable>
              );
            })}
          </View>

          <Field label="Label" value={label} onChangeText={setLabel} placeholder="e.g. May salary - Marie" />
          <Field label="Amount ($)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />

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

          <Field
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything to remember..."
            multiline
            numberOfLines={2}
            style={{ minHeight: 60, textAlignVertical: 'top' }}
          />
          <Button title="Save expense" onPress={submit} loading={busy} />
        </Card>

        {/* History */}
        <H2>Recent expenses</H2>
        {sorted.length === 0 ? (
          <Card><Body muted>No expenses recorded yet.</Body></Card>
        ) : (
          sorted.slice(0, 50).map((e) => (
            <Card key={e.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <H3 style={{ marginBottom: 0 }}>{e.label}</H3>
                <Body style={{ fontWeight: '700' }}>${e.amount.toFixed(2)}</Body>
              </Row>
              <Body muted>
                {CATEGORIES.find((c) => c.id === e.category)?.label} · {e.paymentMethod === 'cash' ? 'Cash' : 'Whish'} · {format(parseISO(e.dateISO), 'd MMM yyyy')}
              </Body>
              {e.notes && <Body muted style={{ marginTop: 4 }}>{e.notes}</Body>}
              <View style={{ height: theme.spacing.sm }} />
              <Button title="Delete" variant="danger" onPress={() => setPendingDelete(e)} />
            </Card>
          ))
        )}
      </ScrollView>
      <ConfirmModal
        visible={!!pendingDelete}
        title="Delete expense?"
        message={pendingDelete ? `${pendingDelete.label} — $${pendingDelete.amount.toFixed(2)}` : ''}
        confirmLabel="Delete"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await deleteExpense(pendingDelete.id);
          setPendingDelete(null);
          reload();
        }}
      />
    </Screen>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Card>
        <Body muted>{label}</Body>
        <H2 style={{ marginTop: 4, marginBottom: 0, color: color ?? theme.colors.text }}>{value}</H2>
      </Card>
    </View>
  );
}
