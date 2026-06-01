export type Role = 'admin' | 'employee';

export interface ServiceCategory {
  id: string;
  name: string;
  isNailRelated: boolean;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  categoryId: string;
}

export interface Employee {
  id: string;
  name: string;
  pin: string;
}

export type PaymentMethod = 'cash' | 'whish';

export interface WorkLog {
  id: string;
  employeeId: string;
  employeeName: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  colorCode?: string;
  notes?: string;
  categoryId: string;
  categoryName: string;
  startISO: string;
  endISO: string;
  createdAtISO: string;
}

export type ExpenseCategory = 'salary' | 'douda' | 'institut' | 'other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  label: string;
  amount: number;
  paymentMethod: PaymentMethod;
  dateISO: string;
  notes?: string;
  createdAtISO: string;
}

export interface Appointment {
  id: string;
  clientName: string;
  employeeId: string;
  employeeName: string;
  serviceId: string;
  serviceName: string;
  categoryId: string;
  categoryName: string;
  dateISO: string;
  timeISO: string;
  notes?: string;
  notified?: boolean;
}

export interface Session {
  role: Role;
  employeeId?: string;
  employeeName?: string;
}
