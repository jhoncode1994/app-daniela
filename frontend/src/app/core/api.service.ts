import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  DashboardSummary,
  PaymentRecord,
  SettlementPreview,
  ShiftInput,
  ShiftPreview,
  WorkShift,
  Worker,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  getDashboard() {
    return this.http.get<DashboardSummary>('/api/dashboard');
  }

  getWorkers() {
    return this.http.get<Worker[]>('/api/workers');
  }

  createWorker(data: { name: string; hourlyRate: number; active?: boolean }) {
    return this.http.post<Worker>('/api/workers', data);
  }

  updateWorker(id: string, data: Partial<{ name: string; hourlyRate: number; active: boolean }>) {
    return this.http.patch<Worker>(`/api/workers/${id}`, data);
  }

  deleteWorker(id: string) {
    return this.http.delete(`/api/workers/${id}`);
  }

  previewShift(data: ShiftInput) {
    return this.http.post<ShiftPreview>('/api/shifts/preview', data);
  }

  createShift(data: ShiftInput) {
    return this.http.post<WorkShift>('/api/shifts', data);
  }

  getShifts(filters: {
    workerId?: string;
    from?: string;
    to?: string;
    paymentStatus?: string;
  }) {
    let params = new HttpParams();
    if (filters.workerId) {
      params = params.set('workerId', filters.workerId);
    }
    if (filters.from) {
      params = params.set('from', filters.from);
    }
    if (filters.to) {
      params = params.set('to', filters.to);
    }
    if (filters.paymentStatus) {
      params = params.set('paymentStatus', filters.paymentStatus);
    }
    return this.http.get<WorkShift[]>('/api/shifts', { params });
  }

  deleteShift(id: string) {
    return this.http.delete(`/api/shifts/${id}`);
  }

  previewSettlement(workerId: string, from: string, to: string) {
    return this.http.get<SettlementPreview>('/api/settlements/preview', {
      params: { workerId, from, to },
    });
  }

  createPayment(data: { workerId: string; from: string; to: string; paymentDate?: string }) {
    return this.http.post<PaymentRecord>('/api/payments', data);
  }

  getPayments(workerId?: string) {
    let params = new HttpParams();
    if (workerId) {
      params = params.set('workerId', workerId);
    }
    return this.http.get<PaymentRecord[]>('/api/payments', { params });
  }
}
