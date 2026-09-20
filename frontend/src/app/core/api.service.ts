import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  BatchShiftPreview,
  BatchShiftsInput,
  DashboardSummary,
  PaymentRecord,
  Provider,
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

  getProviders() {
    return this.http.get<Provider[]>('/api/providers');
  }

  createProvider(data: { name: string; active?: boolean }) {
    return this.http.post<Provider>('/api/providers', data);
  }

  updateProvider(id: string, data: Partial<{ name: string; active: boolean }>) {
    return this.http.patch<Provider>(`/api/providers/${id}`, data);
  }

  deleteProvider(id: string) {
    return this.http.delete(`/api/providers/${id}`);
  }

  previewShift(data: ShiftInput) {
    return this.http.post<ShiftPreview>('/api/shifts/preview', data);
  }

  previewBatchShifts(data: BatchShiftsInput) {
    return this.http.post<BatchShiftPreview>('/api/shifts/preview-batch', data);
  }

  createShift(data: ShiftInput) {
    return this.http.post<WorkShift>('/api/shifts', data);
  }

  createBatchShifts(data: BatchShiftsInput) {
    return this.http.post<WorkShift[]>('/api/shifts/batch', data);
  }

  clockIn(data: { workerId: string; providerId: string; workDate: string; startTime: string }) {
    return this.http.post<WorkShift>('/api/shifts/clock-in', data);
  }

  clockOut(data: { workerId: string; endTime: string; mealBreakMinutes?: number }) {
    return this.http.post<WorkShift>('/api/shifts/clock-out', data);
  }

  getOpenShift(workerId: string) {
    return this.http.get<WorkShift | null>(`/api/shifts/open/${workerId}`);
  }

  getShifts(filters: {
    workerId?: string;
    providerId?: string;
    from?: string;
    to?: string;
    paymentStatus?: string;
  }) {
    let params = new HttpParams();
    if (filters.workerId) {
      params = params.set('workerId', filters.workerId);
    }
    if (filters.providerId) {
      params = params.set('providerId', filters.providerId);
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

  updateShift(
    id: string,
    data: { workDate?: string; startTime?: string; endTime?: string; mealBreakMinutes?: number },
  ) {
    return this.http.patch<WorkShift>(`/api/shifts/${id}`, data);
  }

  deleteShift(id: string) {
    return this.http.delete(`/api/shifts/${id}`);
  }

  previewSettlement(workerId: string, providerId: string, from: string, to: string) {
    return this.http.get<SettlementPreview>('/api/settlements/preview', {
      params: { workerId, providerId, from, to },
    });
  }

  createPayment(data: {
    workerId: string;
    providerId: string;
    from: string;
    to: string;
    paymentDate?: string;
  }) {
    return this.http.post<PaymentRecord>('/api/payments', data);
  }

  deletePayment(id: string) {
    return this.http.delete<{ deleted: boolean; restoredShifts: number }>(`/api/payments/${id}`);
  }

  getPayments(filters?: { workerId?: string; providerId?: string }) {
    let params = new HttpParams();
    if (filters?.workerId) {
      params = params.set('workerId', filters.workerId);
    }
    if (filters?.providerId) {
      params = params.set('providerId', filters.providerId);
    }
    return this.http.get<PaymentRecord[]>('/api/payments', { params });
  }
}
