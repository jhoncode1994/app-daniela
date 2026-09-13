export interface Worker {
  id: string;
  name: string;
  hourlyRate: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkShift {
  id: string;
  workerId: string;
  worker: { id: string; name: string };
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
  workDate: string;
  segments: ShiftSegmentInput[];
}

export interface BatchShiftPreview {
  worker: { id: string; name: string };
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

export interface DashboardSummary {
  workers: {
    id: string;
    name: string;
    hourlyRate: number;
    pendingAmount: number;
    pendingShifts: number;
  }[];
  totalPending: number;
  totalPaid: number;
  totalEarned: number;
}

export interface SettlementPreview {
  worker: { id: string; name: string };
  from: string;
  to: string;
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
  paymentDate: string;
  amount: number;
  createdAt: string;
  shiftIds: string[];
  shiftCount: number;
}
