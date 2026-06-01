import AsyncStorage from "./storage";
import { supabase } from "./supabase";
import { useEffect, useState, useCallback } from "react";
import { Employee, Service, ServiceCategory, Session, WorkLog, Appointment, Expense } from "../types";

// ================================================================
// Helpers: Supabase-first with AsyncStorage fallback
// ================================================================

async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}
async function setJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// Convert DB row <-> app model helpers
function rowToCategory(r: any): ServiceCategory {
  return { id: r.id, name: r.name, isNailRelated: r.is_nail_related };
}
function rowToService(r: any): Service {
  return { id: r.id, name: r.name, price: Number(r.price), categoryId: r.category_id };
}
function rowToEmployee(r: any): Employee {
  return { id: r.id, name: r.name, pin: r.pin };
}
function rowToLog(r: any): WorkLog {
  return {
    id: r.id, employeeId: r.employee_id, employeeName: r.employee_name,
    clientName: r.client_name, serviceId: r.service_id, serviceName: r.service_name,
    servicePrice: Number(r.service_price), amountPaid: Number(r.amount_paid),
    paymentMethod: r.payment_method || 'cash',
    colorCode: r.color_code || undefined, notes: r.notes || undefined,
    categoryId: r.category_id, categoryName: r.category_name,
    startISO: r.start_iso, endISO: r.end_iso, createdAtISO: r.created_at,
  };
}
function rowToAppointment(r: any): Appointment {
  return {
    id: r.id, clientName: r.client_name, employeeId: r.employee_id,
    employeeName: r.employee_name, serviceId: r.service_id, serviceName: r.service_name,
    categoryId: r.category_id, categoryName: r.category_name,
    dateISO: r.date_iso, timeISO: r.time_iso,
    notes: r.notes || undefined, notified: r.notified || false,
  };
}
function rowToExpense(r: any): Expense {
  return {
    id: r.id, category: r.category, label: r.label,
    amount: Number(r.amount), paymentMethod: r.payment_method || 'cash',
    dateISO: r.date_iso, notes: r.notes || undefined, createdAtISO: r.created_at,
  };
}

// ================================================================
// Default seed data
// ================================================================

const DEFAULT_ADMIN_PIN = "1234";
const DEFAULT_EMPLOYEES: Employee[] = [
  { id: "e1", name: "Sample Employee", pin: "0000" },
];

const DEFAULT_CATEGORIES: ServiceCategory[] = [
  { id: "cat_gel_nails", name: "Gel Nails", isNailRelated: true },
  { id: "cat_manicure", name: "Manicure", isNailRelated: true },
  { id: "cat_pedicure", name: "Pedicure", isNailRelated: true },
  { id: "cat_manicure_pedicure", name: "Manicure & Pedicure", isNailRelated: true },
  { id: "cat_tattoo", name: "Tattoo Services", isNailRelated: false },
  { id: "cat_tattoo_removal", name: "Tattoo Removal", isNailRelated: false },
  { id: "cat_wax", name: "Wax Services", isNailRelated: false },
  { id: "cat_other", name: "Other", isNailRelated: false },
];

const DEFAULT_SERVICES: Service[] = [
  { id: "s_gel_polish_protection", name: "Gel polish with protection", price: 20, categoryId: "cat_gel_nails" },
  { id: "s_gel_polish_pedicure", name: "Gel polish pedicure", price: 17, categoryId: "cat_gel_nails" },
  { id: "s_full_set_gel", name: "Full set gel+gel polish", price: 45, categoryId: "cat_gel_nails" },
  { id: "s_gelx_gel_polish", name: "Gel-X+ gel polish", price: 30, categoryId: "cat_gel_nails" },
  { id: "s_refill_gel", name: "Refill gel+gel polish", price: 25, categoryId: "cat_gel_nails" },
  { id: "s_designs_accessories", name: "Designs & accessories", price: 3, categoryId: "cat_gel_nails" },
  { id: "s_french_ombre_mirror", name: "French/ombre/mirror", price: 3, categoryId: "cat_gel_nails" },
  { id: "s_broken_nail", name: "Broken nail", price: 1, categoryId: "cat_gel_nails" },
  { id: "s_manicure_pose", name: "Manicure+pose", price: 8, categoryId: "cat_manicure" },
  { id: "s_spa_manicure_pose", name: "Spa manicure+pose", price: 12, categoryId: "cat_manicure" },
  { id: "s_pose_mani", name: "Pose", price: 5, categoryId: "cat_manicure" },
  { id: "s_manicure", name: "Manicure", price: 7, categoryId: "cat_manicure" },
  { id: "s_add_french_ombre", name: "Add french/ombre", price: 1, categoryId: "cat_manicure" },
  { id: "s_pedicure_pose", name: "Pedicure+pose", price: 10, categoryId: "cat_pedicure" },
  { id: "s_spa_pedicure_pose", name: "Spa pedicure+pose", price: 18, categoryId: "cat_pedicure" },
  { id: "s_pose_pedi", name: "Pose", price: 5, categoryId: "cat_pedicure" },
  { id: "s_pedicure", name: "Pedicure", price: 8, categoryId: "cat_pedicure" },
  { id: "s_mani_pedi_parafine", name: "Manicure & Pedicure & Parafine", price: 30, categoryId: "cat_manicure_pedicure" },
  { id: "s_eyebrows_tattoo", name: "Eyebrows tattoo", price: 125, categoryId: "cat_tattoo" },
  { id: "s_hair_by_hair_eyebrows", name: "Hair by hair eyebrows", price: 150, categoryId: "cat_tattoo" },
  { id: "s_lips_contour_tattoo", name: "Lips contour tattoo", price: 100, categoryId: "cat_tattoo" },
  { id: "s_full_lips_tattoo", name: "Full lips tattoo", price: 120, categoryId: "cat_tattoo" },
  { id: "s_tattoo_removal", name: "Tattoo removal", price: 0, categoryId: "cat_tattoo_removal" },
  { id: "s_wax_full_legs", name: "Full legs", price: 15, categoryId: "cat_wax" },
  { id: "s_wax_half_legs", name: "Half legs", price: 8, categoryId: "cat_wax" },
  { id: "s_wax_full_hands", name: "Full hands", price: 10, categoryId: "cat_wax" },
  { id: "s_wax_half_hands", name: "Half hands", price: 5, categoryId: "cat_wax" },
  { id: "s_wax_under_arms", name: "Under arms", price: 7, categoryId: "cat_wax" },
  { id: "s_wax_bikini_line", name: "Bikini line", price: 10, categoryId: "cat_wax" },
  { id: "s_wax_full_bikini", name: "Full bikini", price: 15, categoryId: "cat_wax" },
  { id: "s_wax_full_belly", name: "Full belly", price: 8, categoryId: "cat_wax" },
  { id: "s_wax_full_back", name: "Full back", price: 10, categoryId: "cat_wax" },
  { id: "s_wax_half_back", name: "Half back", price: 7, categoryId: "cat_wax" },
  { id: "s_wax_full_body", name: "Full body", price: 30, categoryId: "cat_wax" },
  { id: "s_wax_eyebrow_removal", name: "Eyebrow removal", price: 7, categoryId: "cat_wax" },
  { id: "s_wax_moustache_removal", name: "Moustache removal", price: 3, categoryId: "cat_wax" },
  { id: "s_other", name: "Other service", price: 0, categoryId: "cat_other" },
];

// ================================================================
// Initialization — seed Supabase if empty, fallback to local
// ================================================================

export async function ensureSeeded() {
  try {
    // Check if categories exist in Supabase
    const { data: cats } = await supabase.from('categories').select('id').limit(1);
    if (!cats || cats.length === 0) {
      // Seed categories
      await supabase.from('categories').upsert(
        DEFAULT_CATEGORIES.map(c => ({ id: c.id, name: c.name, is_nail_related: c.isNailRelated }))
      );
      // Seed services
      await supabase.from('services').upsert(
        DEFAULT_SERVICES.map(s => ({ id: s.id, name: s.name, price: s.price, category_id: s.categoryId }))
      );
    }
    // Seed default employee if none
    const { data: emps } = await supabase.from('employees').select('id').limit(1);
    if (!emps || emps.length === 0) {
      await supabase.from('employees').upsert(
        DEFAULT_EMPLOYEES.map(e => ({ id: e.id, name: e.name, pin: e.pin }))
      );
    }
    // Seed admin pin if missing
    const { data: pin } = await supabase.from('admin_config').select('value').eq('key', 'admin_pin').single();
    if (!pin) {
      await supabase.from('admin_config').upsert({ key: 'admin_pin', value: DEFAULT_ADMIN_PIN });
    }
  } catch {
    // Offline — fallback to local seeding
    const adminPin = await AsyncStorage.getItem("douda.adminPin");
    if (!adminPin) await AsyncStorage.setItem("douda.adminPin", DEFAULT_ADMIN_PIN);
    const emp = await AsyncStorage.getItem("douda.employees");
    if (!emp) await setJSON("douda.employees", DEFAULT_EMPLOYEES);
    const storedVersion = await AsyncStorage.getItem("douda.dataVersion");
    const version = storedVersion ? parseInt(storedVersion, 10) : 0;
    if (version < 2) {
      await setJSON("douda.categories", DEFAULT_CATEGORIES);
      await setJSON("douda.services", DEFAULT_SERVICES);
      await AsyncStorage.setItem("douda.dataVersion", "2");
    }
  }
}

// ================================================================
// Session (always local — device-specific)
// ================================================================

export async function getSession(): Promise<Session | null> {
  return getJSON<Session | null>("douda.session", null);
}
export async function setSession(s: Session | null) {
  if (s) await setJSON("douda.session", s);
  else await AsyncStorage.removeItem("douda.session");
}

// ================================================================
// Auth
// ================================================================

export async function getAdminPin(): Promise<string> {
  try {
    const { data } = await supabase.from('admin_config').select('value').eq('key', 'admin_pin').single();
    if (data?.value) return data.value;
  } catch {}
  return (await AsyncStorage.getItem("douda.adminPin")) ?? DEFAULT_ADMIN_PIN;
}

export async function setAdminPin(pin: string) {
  try {
    await supabase.from('admin_config').upsert({ key: 'admin_pin', value: pin });
  } catch {}
  await AsyncStorage.setItem("douda.adminPin", pin);
}

// ================================================================
// Categories
// ================================================================

export async function getCategories(): Promise<ServiceCategory[]> {
  try {
    const { data, error } = await supabase.from('categories').select('*').order('created_at');
    if (!error && data) return data.map(rowToCategory);
  } catch {}
  return getJSON<ServiceCategory[]>("douda.categories", []);
}

export async function saveCategories(list: ServiceCategory[]) {
  await setJSON("douda.categories", list);
}

export async function addCategory(name: string, isNailRelated: boolean): Promise<ServiceCategory> {
  const c: ServiceCategory = { id: `cat_${Date.now()}`, name, isNailRelated };
  try {
    await supabase.from('categories').insert({ id: c.id, name: c.name, is_nail_related: c.isNailRelated });
  } catch {}
  const list = await getJSON<ServiceCategory[]>("douda.categories", []);
  list.push(c);
  await setJSON("douda.categories", list);
  return c;
}

export async function deleteCategory(id: string) {
  try { await supabase.from('categories').delete().eq('id', id); } catch {}
  const list = await getJSON<ServiceCategory[]>("douda.categories", []);
  await setJSON("douda.categories", list.filter(c => c.id !== id));
}

// ================================================================
// Employees
// ================================================================

export async function getEmployees(): Promise<Employee[]> {
  try {
    const { data, error } = await supabase.from('employees').select('*').order('created_at');
    if (!error && data) return data.map(rowToEmployee);
  } catch {}
  return getJSON<Employee[]>("douda.employees", []);
}

export async function saveEmployees(list: Employee[]) {
  await setJSON("douda.employees", list);
}

export async function addEmployee(name: string, pin: string): Promise<Employee> {
  const e: Employee = { id: `e_${Date.now()}`, name, pin };
  try {
    await supabase.from('employees').insert({ id: e.id, name: e.name, pin: e.pin });
  } catch {}
  const list = await getJSON<Employee[]>("douda.employees", []);
  list.push(e);
  await setJSON("douda.employees", list);
  return e;
}

export async function deleteEmployee(id: string) {
  try { await supabase.from('employees').delete().eq('id', id); } catch {}
  const list = await getJSON<Employee[]>("douda.employees", []);
  await setJSON("douda.employees", list.filter(e => e.id !== id));
}

export async function findEmployeeByPin(pin: string): Promise<Employee | null> {
  try {
    const { data } = await supabase.from('employees').select('*').eq('pin', pin).limit(1);
    if (data && data.length > 0) return rowToEmployee(data[0]);
  } catch {}
  const list = await getJSON<Employee[]>("douda.employees", []);
  return list.find(e => e.pin === pin) ?? null;
}

// ================================================================
// Services
// ================================================================

export async function getServices(): Promise<Service[]> {
  try {
    const { data, error } = await supabase.from('services').select('*').order('created_at');
    if (!error && data) return data.map(rowToService);
  } catch {}
  return getJSON<Service[]>("douda.services", []);
}

export async function saveServices(list: Service[]) {
  await setJSON("douda.services", list);
}

export async function addService(name: string, price: number, categoryId: string): Promise<Service> {
  const s: Service = { id: `s_${Date.now()}`, name, price, categoryId };
  try {
    await supabase.from('services').insert({ id: s.id, name: s.name, price: s.price, category_id: s.categoryId });
  } catch {}
  const list = await getJSON<Service[]>("douda.services", []);
  list.push(s);
  await setJSON("douda.services", list);
  return s;
}

export async function deleteService(id: string) {
  try { await supabase.from('services').delete().eq('id', id); } catch {}
  const list = await getJSON<Service[]>("douda.services", []);
  await setJSON("douda.services", list.filter(s => s.id !== id));
}

// ================================================================
// Work Logs
// ================================================================

export async function getLogs(): Promise<WorkLog[]> {
  try {
    const { data, error } = await supabase.from('work_logs').select('*').order('created_at', { ascending: false });
    if (!error && data) return data.map(rowToLog);
  } catch {}
  return getJSON<WorkLog[]>("douda.logs", []);
}

export async function addLog(entry: Omit<WorkLog, "id" | "createdAtISO">): Promise<WorkLog> {
  const id = `l_${Date.now()}`;
  const now = new Date().toISOString();
  const log: WorkLog = { ...entry, id, createdAtISO: now };
  try {
    await supabase.from('work_logs').insert({
      id, employee_id: entry.employeeId, employee_name: entry.employeeName,
      client_name: entry.clientName, service_id: entry.serviceId, service_name: entry.serviceName,
      service_price: entry.servicePrice, amount_paid: entry.amountPaid,
      payment_method: entry.paymentMethod || 'cash',
      color_code: entry.colorCode || null, notes: entry.notes || null,
      category_id: entry.categoryId, category_name: entry.categoryName,
      start_iso: entry.startISO, end_iso: entry.endISO,
    });
  } catch {}
  const list = await getJSON<WorkLog[]>("douda.logs", []);
  list.push(log);
  await setJSON("douda.logs", list);
  return log;
}

export async function deleteLog(id: string) {
  try { await supabase.from('work_logs').delete().eq('id', id); } catch {}
  const list = await getJSON<WorkLog[]>("douda.logs", []);
  await setJSON("douda.logs", list.filter(l => l.id !== id));
}

// ================================================================
// Appointments
// ================================================================

export async function getAppointments(): Promise<Appointment[]> {
  try {
    const { data, error } = await supabase.from('appointments').select('*').order('time_iso');
    if (!error && data) return data.map(rowToAppointment);
  } catch {}
  return getJSON<Appointment[]>("douda.appointments", []);
}

export async function saveAppointments(list: Appointment[]) {
  await setJSON("douda.appointments", list);
}

export async function addAppointment(entry: Omit<Appointment, "id" | "notified">): Promise<Appointment> {
  const id = `a_${Date.now()}`;
  const appt: Appointment = { ...entry, id, notified: false };
  try {
    await supabase.from('appointments').insert({
      id, client_name: entry.clientName, employee_id: entry.employeeId,
      employee_name: entry.employeeName, service_id: entry.serviceId, service_name: entry.serviceName,
      category_id: entry.categoryId, category_name: entry.categoryName,
      date_iso: entry.dateISO, time_iso: entry.timeISO, notes: entry.notes || null,
    });
  } catch {}
  const list = await getJSON<Appointment[]>("douda.appointments", []);
  list.push(appt);
  await setJSON("douda.appointments", list);
  return appt;
}

export async function deleteAppointment(id: string) {
  try { await supabase.from('appointments').delete().eq('id', id); } catch {}
  const list = await getJSON<Appointment[]>("douda.appointments", []);
  await setJSON("douda.appointments", list.filter(a => a.id !== id));
}

export async function markNotified(id: string) {
  try { await supabase.from('appointments').update({ notified: true }).eq('id', id); } catch {}
  const list = await getJSON<Appointment[]>("douda.appointments", []);
  const idx = list.findIndex(a => a.id === id);
  if (idx !== -1) { list[idx].notified = true; await setJSON("douda.appointments", list); }
}

// ================================================================
// Expenses
// ================================================================

export async function getExpenses(): Promise<Expense[]> {
  try {
    const { data, error } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    if (!error && data) return data.map(rowToExpense);
  } catch {}
  return getJSON<Expense[]>("douda.expenses", []);
}

export async function addExpense(entry: Omit<Expense, "id" | "createdAtISO">): Promise<Expense> {
  const id = `x_${Date.now()}`;
  const now = new Date().toISOString();
  const e: Expense = { ...entry, id, createdAtISO: now };
  try {
    await supabase.from('expenses').insert({
      id, category: entry.category, label: entry.label, amount: entry.amount,
      payment_method: entry.paymentMethod || 'cash', date_iso: entry.dateISO,
      notes: entry.notes || null,
    });
  } catch {}
  const list = await getJSON<Expense[]>("douda.expenses", []);
  list.push(e);
  await setJSON("douda.expenses", list);
  return e;
}

export async function deleteExpense(id: string) {
  try { await supabase.from('expenses').delete().eq('id', id); } catch {}
  const list = await getJSON<Expense[]>("douda.expenses", []);
  await setJSON("douda.expenses", list.filter(e => e.id !== id));
}

// ================================================================
// Convenience hook
// ================================================================

export function useAsync<T>(
  loader: () => Promise<T>,
  deps: any[] = [],
): { data: T | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    loader().then(setData).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { data, loading, reload };
}
