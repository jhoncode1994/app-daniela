export interface Worker {
  id: string;
  name: string;
  hourlyRate: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Provider {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Lot {
  id: string;
  providerId: string;
  provider: { id: string; name: string };
  reference: string;
  notes: string | null;
  units: number;
  unitPrice: number;
  closed: boolean;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** units * unitPrice */
  value: number;
  laborPaid: number;
  laborPending: number;
  laborTotal: number;
  /** value - laborTotal */
  profit: number;
  paidShifts: number;
  pendingShifts: number;
}

export interface LotRef {
  id: string;
  reference: string;
}

export interface WorkShift {
  id: string;
  workerId: string;
  providerId: string;
  lotId: string | null;
  worker: { id: string; name: string };
  provider: { id: string; name: string };
  lot: LotRef | null;
  workDate: string;
  startTime: string;
  endTime: string | null;
  mealBreakMinutes: number;
  grossMinutes: number;
  netMinutes: number;
  hourlyRate: number;
  earnedAmount: number;
  paymentStatus: 'PENDIENTE' | 'PAGADA';
  open?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftPreview {
  worker: { id: string; name: string };
  provider: { id: string; name: string };
  lot: LotRef;
  workDate: string;
  startTime: string;
  endTime: string;
  mealBreakMinutes: number;
  grossMinutes: number;
  netMinutes: number;
  hourlyRate: number;
  earnedAmount: number;
}

export interface ShiftInput {
  workerId: string;
  providerId: string;
  lotId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  mealBreakMinutes: number;
}

export interface ShiftSegmentInput {
  startTime: string;
  endTime: string;
  mealBreakMinutes: number;
}

export interface BatchShiftsInput {
  workerId: string;
  providerId: string;
  lotId: string;
  workDate: string;
  segments: ShiftSegmentInput[];
}

export interface BatchShiftPreview {
  worker: { id: string; name: string };
  provider: { id: string; name: string };
  lot: LotRef;
  workDate: string;
  segments: {
    startTime: string;
    endTime: string;
    mealBreakMinutes: number;
    grossMinutes: number;
    netMinutes: number;
    hourlyRate: number;
    earnedAmount: number;
  }[];
  totals: {
    grossMinutes: number;
    mealBreakMinutes: number;
    netMinutes: number;
    hourlyRate: number;
    earnedAmount: number;
  };
}

export interface LotDebt {
  lotId: string | null;
  reference: string;
  closed: boolean;
  pendingAmount: number;
  pendingShifts: number;
}

export interface ProviderDebt {
  providerId: string;
  providerName: string;
  pendingAmount: number;
  pendingShifts: number;
  lots: LotDebt[];
}

export interface DashboardSummary {
  workers: {
    id: string;
    name: string;
    hourlyRate: number;
    pendingAmount: number;
    pendingShifts: number;
    breakdown: ProviderDebt[];
  }[];
  totalPending: number;
  totalPaid: number;
  totalEarned: number;
}

export interface SettlementPreview {
  worker: { id: string; name: string };
  provider: { id: string; name: string };
  lot: { id: string; reference: string; closed: boolean };
  from: string | null;
  to: string | null;
  grossMinutes: number;
  mealMinutes: number;
  netMinutes: number;
  earnedAmount: number;
  paidAmount: number;
  pendingAmount: number;
  pendingShiftCount: number;
  shifts: WorkShift[];
}

export interface PaymentRecord {
  id: string;
  workerId: string;
  worker: { id: string; name: string };
  providerId: string | null;
  provider: { id: string; name: string } | null;
  lotId: string | null;
  lot: LotRef | null;
  paymentDate: string;
  amount: number;
  createdAt: string;
  shiftIds: string[];
  shiftCount: number;
  shifts: PaymentShiftDetail[];
  voided: boolean;
  voidedAt: string | null;
}

export interface PaymentShiftDetail {
  id: string;
  workDate: string;
  startTime: string;
  endTime: string | null;
  mealBreakMinutes: number;
  grossMinutes: number;
  netMinutes: number;
  hourlyRate: number;
  earnedAmount: number;
}
