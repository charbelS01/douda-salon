import { Platform } from 'react-native';
import * as XLSX from 'xlsx';
import { getLogs, getExpenses, getAppointments } from './store';

async function saveFile(data: ArrayBuffer, filename: string) {
  if (Platform.OS === 'web') {
    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  // Native: use expo-file-system + expo-sharing
  const FileSystem = require('expo-file-system');
  const Sharing = require('expo-sharing');
  const base64 = arrayBufferToBase64(data);
  const fileUri = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Export Data',
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function exportAllData() {
  const logs = await getLogs();
  const expenses = await getExpenses();
  const appointments = await getAppointments();

  const wb = XLSX.utils.book_new();

  // Work logs sheet
  const logRows = logs.map(l => ({
    Date: l.startISO?.split('T')[0] ?? '',
    Client: l.clientName,
    Employee: l.employeeName,
    Category: l.categoryName,
    Service: l.serviceName,
    'Listed Price': l.servicePrice,
    'Amount Paid': l.amountPaid,
    'Payment Method': l.paymentMethod ?? 'cash',
    'Color Code': l.colorCode ?? '',
    Notes: l.notes ?? '',
    Start: l.startISO,
    End: l.endISO,
  }));
  const wsLogs = XLSX.utils.json_to_sheet(logRows);
  XLSX.utils.book_append_sheet(wb, wsLogs, 'Work Logs');

  // Expenses sheet
  const expRows = expenses.map(e => ({
    Date: e.dateISO?.split('T')[0] ?? '',
    Category: e.category,
    Label: e.label,
    Amount: e.amount,
    'Payment Method': e.paymentMethod ?? 'cash',
    Notes: e.notes ?? '',
  }));
  const wsExp = XLSX.utils.json_to_sheet(expRows);
  XLSX.utils.book_append_sheet(wb, wsExp, 'Expenses');

  // Appointments sheet
  const apptRows = appointments.map(a => ({
    Date: a.dateISO?.split('T')[0] ?? '',
    Time: a.timeISO,
    Client: a.clientName,
    Employee: a.employeeName,
    Category: a.categoryName,
    Service: a.serviceName,
    Notes: a.notes ?? '',
  }));
  const wsAppt = XLSX.utils.json_to_sheet(apptRows);
  XLSX.utils.book_append_sheet(wb, wsAppt, 'Appointments');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const today = new Date().toISOString().split('T')[0];
  await saveFile(buf, `douda-salon-${today}.xlsx`);
}
