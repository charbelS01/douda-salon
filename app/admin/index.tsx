import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { format, subDays, isSameDay, parseISO } from 'date-fns';
import { Body, Card, H1, H2, H3, Pill, Row, Screen } from '../../src/components/UI';
import { getLogs, getSession } from '../../src/store/store';
import { DailySummary, formatMinutes, summarizeDay } from '../../src/store/summary';
import { WorkLog } from '../../src/types';
import { theme } from '../../src/theme';

interface WeeklyStats {
  totalIncome: number;
  totalServices: number;
  avgIncomePerDay: number;
  topServices: { name: string; count: number; revenue: number }[];
  topEmployees: { name: string; earnings: number; count: number }[];
  dailyBreakdown: { date: Date; income: number; services: number }[];
  categoryBreakdown: { name: string; count: number; revenue: number }[];
}

function computeWeeklyStats(allLogs: WorkLog[], days: number): WeeklyStats {
  const today = new Date();
  const relevantLogs = allLogs.filter((l) => {
    const d = parseISO(l.startISO);
    return d >= subDays(today, days - 1) && d <= today;
  });

  let totalIncome = 0;
  const svcMap = new Map<string, { name: string; count: number; revenue: number }>();
  const empMap = new Map<string, { name: string; earnings: number; count: number }>();
  const catMap = new Map<string, { name: string; count: number; revenue: number }>();

  relevantLogs.forEach((l) => {
    const paid = l.amountPaid ?? l.servicePrice;
    totalIncome += paid;

    const svc = svcMap.get(l.serviceId) ?? { name: l.serviceName, count: 0, revenue: 0 };
    svc.count += 1;
    svc.revenue += paid;
    svcMap.set(l.serviceId, svc);

    const emp = empMap.get(l.employeeId) ?? { name: l.employeeName, earnings: 0, count: 0 };
    emp.earnings += paid;
    emp.count += 1;
    empMap.set(l.employeeId, emp);

    const catName = l.categoryName || 'Uncategorized';
    const cat = catMap.get(catName) ?? { name: catName, count: 0, revenue: 0 };
    cat.count += 1;
    cat.revenue += paid;
    catMap.set(catName, cat);
  });

  const dailyBreakdown: WeeklyStats['dailyBreakdown'] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(today, i);
    const dayLogs = relevantLogs.filter((l) => isSameDay(parseISO(l.startISO), d));
    dailyBreakdown.push({
      date: d,
      income: dayLogs.reduce((a, l) => a + (l.amountPaid ?? l.servicePrice), 0),
      services: dayLogs.length,
    });
  }

  return {
    totalIncome,
    totalServices: relevantLogs.length,
    avgIncomePerDay: days > 0 ? totalIncome / days : 0,
    topServices: Array.from(svcMap.values()).sort((a, b) => b.count - a.count).slice(0, 5),
    topEmployees: Array.from(empMap.values()).sort((a, b) => b.earnings - a.earnings),
    dailyBreakdown,
    categoryBreakdown: Array.from(catMap.values()).sort((a, b) => b.revenue - a.revenue),
  };
}

export default function AdminDashboard() {
  const [todaySummary, setTodaySummary] = useState<DailySummary | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<WeeklyStats | null>(null);
  const [todayCash, setTodayCash] = useState(0);
  const [todayWhish, setTodayWhish] = useState(0);

  const reload = useCallback(async () => {
    const s = await getSession();
    if (!s || s.role !== 'admin') {
      router.replace('/login');
      return;
    }
    const all = await getLogs();
    setTodaySummary(summarizeDay(all, new Date()));
    setWeeklyStats(computeWeeklyStats(all, 7));
    setMonthlyStats(computeWeeklyStats(all, 30));
    const todayLogs = all.filter((l) => isSameDay(parseISO(l.startISO), new Date()));
    setTodayCash(todayLogs.filter((l) => (l.paymentMethod ?? 'cash') === 'cash').reduce((a, l) => a + (l.amountPaid ?? l.servicePrice), 0));
    setTodayWhish(todayLogs.filter((l) => l.paymentMethod === 'whish').reduce((a, l) => a + (l.amountPaid ?? l.servicePrice), 0));
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const maxDailyIncome = Math.max(...(weeklyStats?.dailyBreakdown.map((d) => d.income) ?? [1]), 1);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}>
        <Pill label="Owner" />
        <View style={{ height: theme.spacing.sm }} />
        <H1>Dashboard</H1>
        <Body muted>{format(new Date(), 'EEEE, MMMM d, yyyy')}</Body>

        <View style={{ height: theme.spacing.lg }} />

        {/* Today KPIs */}
        <H2>Today</H2>
        <Row style={{ gap: theme.spacing.md }}>
          <Kpi label="Income" value={`$${(todaySummary?.totalIncome ?? 0).toFixed(2)}`} />
          <Kpi label="Services" value={`${todaySummary?.totalServices ?? 0}`} />
        </Row>
        <Row style={{ gap: theme.spacing.md }}>
          <Kpi label="Hours worked" value={formatMinutes(todaySummary?.totalMinutes ?? 0)} />
          <Kpi label="Active staff" value={`${todaySummary?.perEmployee.length ?? 0}`} />
        </Row>
        <Row style={{ gap: theme.spacing.md }}>
          <Kpi label="Cash" value={`$${(todayCash).toFixed(2)}`} />
          <Kpi label="Whish" value={`$${(todayWhish).toFixed(2)}`} />
        </Row>

        {/* Services today */}
        <Card>
          <H2>Services performed today</H2>
          {todaySummary && todaySummary.serviceBreakdown.length > 0 ? (
            todaySummary.serviceBreakdown.map((s) => (
              <Row key={s.name} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
                <Body>{s.name}</Body>
                <Body muted>{s.count} · ${s.revenue.toFixed(2)}</Body>
              </Row>
            ))
          ) : (
            <Body muted>No services logged yet today.</Body>
          )}
        </Card>

        {/* Per employee today */}
        <H2>By employee today</H2>
        {todaySummary && todaySummary.perEmployee.length > 0 ? (
          todaySummary.perEmployee.map((e) => (
            <Pressable
              key={e.employeeId}
              onPress={() => router.push({ pathname: '/admin/employee-logs', params: { employeeId: e.employeeId } })}
            >
              <Card>
                <Row style={{ justifyContent: 'space-between' }}>
                  <H3 style={{ marginBottom: 0 }}>{e.employeeName} ›</H3>
                  <Body style={{ fontWeight: '700' }}>${e.earnings.toFixed(2)}</Body>
                </Row>
                <Body muted style={{ marginBottom: theme.spacing.sm }}>
                  {formatMinutes(e.minutes)} worked · {e.logs.length} clients · tap to review
                </Body>
                {e.services.map((s) => (
                  <Row key={s.name} style={{ justifyContent: 'space-between', paddingVertical: 2 }}>
                    <Body>· {s.name}</Body>
                    <Body muted>{s.count} · ${s.revenue.toFixed(2)}</Body>
                  </Row>
                ))}
              </Card>
            </Pressable>
          ))
        ) : (
          <Card><Body muted>No employees have logged work yet today.</Body></Card>
        )}

        {/* Weekly overview */}
        <View style={{ height: theme.spacing.lg }} />
        <H2>Last 7 days</H2>
        <Row style={{ gap: theme.spacing.md }}>
          <Kpi label="Total income" value={`$${(weeklyStats?.totalIncome ?? 0).toFixed(2)}`} />
          <Kpi label="Total services" value={`${weeklyStats?.totalServices ?? 0}`} />
        </Row>
        <Kpi label="Avg/day" value={`$${(weeklyStats?.avgIncomePerDay ?? 0).toFixed(2)}`} />

        {/* Simple bar chart */}
        <Card>
          <H2>Daily income (7 days)</H2>
          {weeklyStats?.dailyBreakdown.map((d) => (
            <View key={d.date.toISOString()} style={{ marginBottom: 8 }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 2 }}>
                <Body style={{ fontSize: 13 }}>{format(d.date, 'EEE d')}</Body>
                <Body style={{ fontSize: 13 }}>${d.income.toFixed(0)} · {d.services} svc</Body>
              </Row>
              <View style={{ height: 8, backgroundColor: theme.colors.border, borderRadius: 4 }}>
                <View
                  style={{
                    height: 8,
                    width: `${Math.max((d.income / maxDailyIncome) * 100, 2)}%`,
                    backgroundColor: theme.colors.primary,
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>
          ))}
        </Card>

        {/* Top services */}
        <Card>
          <H2>Most popular services (7 days)</H2>
          {weeklyStats && weeklyStats.topServices.length > 0 ? (
            weeklyStats.topServices.map((s, i) => (
              <Row key={s.name} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
                <Body>{i + 1}. {s.name}</Body>
                <Body muted>{s.count}x · ${s.revenue.toFixed(2)}</Body>
              </Row>
            ))
          ) : (
            <Body muted>No data yet.</Body>
          )}
        </Card>

        {/* Category breakdown */}
        <Card>
          <H2>Revenue by category (7 days)</H2>
          {weeklyStats && weeklyStats.categoryBreakdown.length > 0 ? (
            weeklyStats.categoryBreakdown.map((c) => (
              <Row key={c.name} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
                <Body>{c.name}</Body>
                <Body muted>{c.count} services · ${c.revenue.toFixed(2)}</Body>
              </Row>
            ))
          ) : (
            <Body muted>No data yet.</Body>
          )}
        </Card>

        {/* Top employees */}
        <Card>
          <H2>Top employees (7 days)</H2>
          {weeklyStats && weeklyStats.topEmployees.length > 0 ? (
            weeklyStats.topEmployees.map((e, i) => (
              <Row key={e.name} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
                <Body>{i + 1}. {e.name}</Body>
                <Body muted>{e.count} clients · ${e.earnings.toFixed(2)}</Body>
              </Row>
            ))
          ) : (
            <Body muted>No data yet.</Body>
          )}
        </Card>

        {/* Monthly overview */}
        <View style={{ height: theme.spacing.lg }} />
        <H2>Last 30 days</H2>
        <Row style={{ gap: theme.spacing.md }}>
          <Kpi label="Total income" value={`$${(monthlyStats?.totalIncome ?? 0).toFixed(2)}`} />
          <Kpi label="Total services" value={`${monthlyStats?.totalServices ?? 0}`} />
        </Row>
        <Kpi label="Avg/day" value={`$${(monthlyStats?.avgIncomePerDay ?? 0).toFixed(2)}`} />

        <Card>
          <H2>Most popular services (30 days)</H2>
          {monthlyStats && monthlyStats.topServices.length > 0 ? (
            monthlyStats.topServices.map((s, i) => (
              <Row key={s.name} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
                <Body>{i + 1}. {s.name}</Body>
                <Body muted>{s.count}x · ${s.revenue.toFixed(2)}</Body>
              </Row>
            ))
          ) : (
            <Body muted>No data yet.</Body>
          )}
        </Card>
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
