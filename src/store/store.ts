import AsyncStorage from "./storage";
import { useEffect, useState, useCallback } from "react";
import { Employee, Service, Session, WorkLog } from "../types";

const KEYS = {
  employees: "douda.employees",
  services: "douda.services",
  logs: "douda.logs",
  session: "douda.session",
  adminPin: "douda.adminPin",
};

// ---- Defaults ----
const DEFAULT_ADMIN_PIN = "1234"; // Owner can change later
const DEFAULT_EMPLOYEES: Employee[] = [
  { id: "e1", name: "Sample Employee", pin: "0000" },
];
const DEFAULT_SERVICES: Service[] = [
  { id: "s_gel", name: "Gel", price: 0 },
  { id: "s_gelish", name: "Gelish", price: 0 },
  { id: "s_manicure", name: "Manicure", price: 0 },
  { id: "s_pedicure", name: "Pedicure", price: 0 },
];

// ---- Generic helpers ----
async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
async function setJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// ---- Initialization ----
export async function ensureSeeded() {
  const adminPin = await AsyncStorage.getItem(KEYS.adminPin);
  if (!adminPin) await AsyncStorage.setItem(KEYS.adminPin, DEFAULT_ADMIN_PIN);
  const emp = await AsyncStorage.getItem(KEYS.employees);
  if (!emp) await setJSON(KEYS.employees, DEFAULT_EMPLOYEES);
  const svc = await AsyncStorage.getItem(KEYS.services);
  if (!svc) await setJSON(KEYS.services, DEFAULT_SERVICES);
}

// ---- Session ----
export async function getSession(): Promise<Session | null> {
  return getJSON<Session | null>(KEYS.session, null);
}
export async function setSession(s: Session | null) {
  if (s) await setJSON(KEYS.session, s);
  else await AsyncStorage.removeItem(KEYS.session);
}

// ---- Auth ----
export async function getAdminPin(): Promise<string> {
  return (await AsyncStorage.getItem(KEYS.adminPin)) ?? DEFAULT_ADMIN_PIN;
}
export async function setAdminPin(pin: string) {
  await AsyncStorage.setItem(KEYS.adminPin, pin);
}

// ---- Employees ----
export async function getEmployees(): Promise<Employee[]> {
  return getJSON<Employee[]>(KEYS.employees, []);
}
export async function saveEmployees(list: Employee[]) {
  await setJSON(KEYS.employees, list);
}
export async function addEmployee(
  name: string,
  pin: string,
): Promise<Employee> {
  const list = await getEmployees();
  const e: Employee = { id: `e_${Date.now()}`, name, pin };
  list.push(e);
  await saveEmployees(list);
  return e;
}
export async function deleteEmployee(id: string) {
  const list = await getEmployees();
  await saveEmployees(list.filter((e) => e.id !== id));
}
export async function findEmployeeByPin(pin: string): Promise<Employee | null> {
  const list = await getEmployees();
  return list.find((e) => e.pin === pin) ?? null;
}

// ---- Services ----
export async function getServices(): Promise<Service[]> {
  return getJSON<Service[]>(KEYS.services, []);
}
export async function saveServices(list: Service[]) {
  await setJSON(KEYS.services, list);
}
export async function addService(
  name: string,
  price: number,
): Promise<Service> {
  const list = await getServices();
  const s: Service = { id: `s_${Date.now()}`, name, price };
  list.push(s);
  await saveServices(list);
  return s;
}
export async function deleteService(id: string) {
  const list = await getServices();
  await saveServices(list.filter((s) => s.id !== id));
}

// ---- Work logs ----
export async function getLogs(): Promise<WorkLog[]> {
  return getJSON<WorkLog[]>(KEYS.logs, []);
}
export async function addLog(
  entry: Omit<WorkLog, "id" | "createdAtISO">,
): Promise<WorkLog> {
  const list = await getLogs();
  const log: WorkLog = {
    ...entry,
    id: `l_${Date.now()}`,
    createdAtISO: new Date().toISOString(),
  };
  list.push(log);
  await setJSON(KEYS.logs, list);
  return log;
}
export async function deleteLog(id: string) {
  const list = await getLogs();
  await setJSON(
    KEYS.logs,
    list.filter((l) => l.id !== id),
  );
}

// ---- Convenience hook to refresh on focus ----
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: any[] = [],
): {
  data: T | null;
  loading: boolean;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    loader()
      .then(setData)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, loading, reload };
}
