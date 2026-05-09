import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { Body, Card, H1, H2, H3, Pill, Row, Screen } from '../../src/components/UI';
import { getLogs, getSession } from '../../src/store/store';
import { DailySummary, formatMinutes, summarizeDay } from '../../src/store/summary';
import { theme } from '../../src/theme';

export default function AdminDashboard() {
  const [summary, setSummary] = useState<DailySummary | null>(null);

  const reload = useCallback(async () => {
    const s = await getSession();
    if (!s || s.role !== 'admin') {
      router.replace('/login');
      return;
    }
    const all = await getLogs();
    setSummary(summarizeDay(all, new Date()));
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}>
        <Pill label="Owner" />
        <View style={{ height: theme.spacing.sm }} />
        <H1>Today</H1>
        <Body muted>{format(new Date(), 'EEEE, MMMM d, yyyy')}</Body>

        <View style={{ height: theme.spacing.lg }} />

        {/* KPIs */}
        <Row style={{ gap: theme.spacing.md }}>
          <Kpi label="Income" value={`$${(summary?.totalIncome ?? 0).toFixed(2)}`} />
          <Kpi label="Services" value={`${summary?.totalServices ?? 0}`} />
        </Row>
        <Row style={{ gap: theme.spacing.md }}>
          <Kpi label="Hours worked" value={formatMinutes(summary?.totalMinutes ?? 0)} />
          <Kpi label="Employees active" value={`${summary?.perEmployee.length ?? 0}`} />
        </Row>

        {/* Service breakdown */}
        <Card>
          <H2>Services performed today</H2>
          {summary && summary.serviceBreakdown.length > 0 ? (
            summary.serviceBreakdown.map((s) => (
              <Row key={s.name} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
                <Body>{s.name}</Body>
                <Body muted>
                  {s.count} · ${s.revenue.toFixed(2)}
                </Body>
              </Row>
            ))
          ) : (
            <Body muted>No services logged yet today.</Body>
          )}
        </Card>

        {/* Per-employee */}
        <H2 style={{ marginTop: theme.spacing.md }}>By employee</H2>
        {summary && summary.perEmployee.length > 0 ? (
          summary.perEmployee.map((e) => (
            <Card key={e.employeeId}>
              <Row style={{ justifyContent: 'space-between' }}>
                <H3 style={{ marginBottom: 0 }}>{e.employeeName}</H3>
                <Body style={{ fontWeight: '700' }}>${e.earnings.toFixed(2)}</Body>
              </Row>
              <Body muted style={{ marginBottom: theme.spacing.sm }}>
                {formatMinutes(e.minutes)} worked · {e.logs.length} clients
              </Body>
              {e.services.map((s) => (
                <Row key={s.name} style={{ justifyContent: 'space-between', paddingVertical: 2 }}>
                  <Body>· {s.name}</Body>
                  <Body muted>
                    {s.count} · ${s.revenue.toFixed(2)}
                  </Body>
                </Row>
              ))}
            </Card>
          ))
        ) : (
          <Card>
            <Body muted>No employees have logged work yet today.</Body>
          </Card>
        )}

        {/* Nav */}
        <H2 style={{ marginTop: theme.spacing.md }}>Manage</H2>
        <NavCard href="/admin/employees" title="Employees" sub="Add, remove and set PINs" />
        <NavCard href="/admin/services" title="Services" sub="Edit your salon's service menu and prices" />
        <NavCard href="/admin/settings" title="Settings" sub="Change owner PIN" />
      </ScrollView>
    </Screen>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Card>
        <Body muted>{label}</Body>
        <H2 style={{ marginTop: 4, marginBottom: 0 }}>{value}</H2>
      </Card>
    </View>
  );
}

function NavCard({ href, title, sub }: { href: any; title: string; sub: string }) {
  return (
    <Link href={href} asChild>
      <Pressable>
        <Card>
          <H3 style={{ marginBottom: 2 }}>{title} →</H3>
          <Body muted>{sub}</Body>
        </Card>
      </Pressable>
    </Link>
  );
}
