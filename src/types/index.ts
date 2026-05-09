export type Role = 'admin' | 'employee';

export interface Service {
  id: string;
  name: string;
  price: number; // unit price
}

export interface Employee {
  id: string;
  name: string;
  pin: string; // 4-digit PIN to log in
}

export interface WorkLog {
  id: string;
  employeeId: string;
  employeeName: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  startISO: string; // ISO datetime
  endISO: string;   // ISO datetime
  createdAtISO: string;
}

export interface Session {
  role: Role;
  employeeId?: string;
  employeeName?: string;
}
