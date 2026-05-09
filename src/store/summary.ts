import { differenceInMinutes, isSameDay, parseISO } from 'date-fns';
import { WorkLog } from '../types';

export interface DailySummary {
  date: Date;
  totalIncome: number;
  totalMinutes: number;
  totalServices: number;
  serviceBreakdown: { name: string; count: number; revenue: number }[];
  perEmployee: {
    employeeId: string;
    employeeName: string;
    minutes: number;
    earnings: number;
    services: { name: string; count: number; revenue: number }[];
    logs: WorkLog[];
  }[];
}

export function summarizeDay(allLogs: WorkLog[], day: Date): DailySummary {
  const todays = allLogs.filter((l) => isSameDay(parseISO(l.startISO), day));

  const svcMap = new Map<string, { name: string; count: number; revenue: number }>();
  let totalIncome = 0;
  let totalMinutes = 0;

  todays.forEach((l) => {
    const mins = Math.max(0, differenceInMinutes(parseISO(l.endISO), parseISO(l.startISO)));
    totalMinutes += mins;
    totalIncome += l.servicePrice;
    const cur = svcMap.get(l.serviceId) ?? { name: l.serviceName, count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += l.servicePrice;
    svcMap.set(l.serviceId, cur);
  });

  // Per employee
  const empMap = new Map<string, DailySummary['perEmployee'][number]>();
  todays.forEach((l) => {
    const mins = Math.max(0, differenceInMinutes(parseISO(l.endISO), parseISO(l.startISO)));
    const cur =
      empMap.get(l.employeeId) ??
      {
        employeeId: l.employeeId,
        employeeName: l.employeeName,
        minutes: 0,
        earnings: 0,
        services: [] as { name: string; count: number; revenue: number }[],
        logs: [] as WorkLog[],
      };
    cur.minutes += mins;
    cur.earnings += l.servicePrice;
    cur.logs.push(l);
    const sIdx = cur.services.findIndex((s) => s.name === l.serviceName);
    if (sIdx === -1) cur.services.push({ name: l.serviceName, count: 1, revenue: l.servicePrice });
    else {
      cur.services[sIdx].count += 1;
      cur.services[sIdx].revenue += l.servicePrice;
    }
    empMap.set(l.employeeId, cur);
  });

  return {
    date: day,
    totalIncome,
    totalMinutes,
    totalServices: todays.length,
    serviceBreakdown: Array.from(svcMap.values()).sort((a, b) => b.count - a.count),
    perEmployee: Array.from(empMap.values()).sort((a, b) => b.earnings - a.earnings),
  };
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
