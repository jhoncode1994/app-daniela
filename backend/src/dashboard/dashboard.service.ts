import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type LotDebt = {
  lotId: string | null;
  reference: string;
  closed: boolean;
  pendingAmount: number;
  pendingShifts: number;
};

type ProviderDebt = {
  providerId: string;
  providerName: string;
  pendingAmount: number;
  pendingShifts: number;
  lots: LotDebt[];
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const workers = await this.prisma.worker.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        workShifts: {
          where: { paymentStatus: PaymentStatus.PENDIENTE, endTime: { not: null } },
          select: {
            earnedAmount: true,
            providerId: true,
            provider: { select: { name: true } },
            lotId: true,
            lot: { select: { reference: true, closed: true } },
          },
        },
      },
    });

    const items = workers.map((worker) => {
      const providers = new Map<string, ProviderDebt>();

      for (const shift of worker.workShifts) {
        let provider = providers.get(shift.providerId);
        if (!provider) {
          provider = {
            providerId: shift.providerId,
            providerName: shift.provider.name,
            pendingAmount: 0,
            pendingShifts: 0,
            lots: [],
          };
          providers.set(shift.providerId, provider);
        }
        provider.pendingAmount += shift.earnedAmount;
        provider.pendingShifts += 1;

        // Las jornadas registradas antes de las referencias quedan agrupadas como "Sin referencia".
        const key = shift.lotId ?? '';
        let lot = provider.lots.find((item) => (item.lotId ?? '') === key);
        if (!lot) {
          lot = {
            lotId: shift.lotId,
            reference: shift.lot?.reference ?? 'Sin referencia',
            closed: shift.lot?.closed ?? false,
            pendingAmount: 0,
            pendingShifts: 0,
          };
          provider.lots.push(lot);
        }
        lot.pendingAmount += shift.earnedAmount;
        lot.pendingShifts += 1;
      }

      const breakdown = [...providers.values()].sort(
        (a, b) => b.pendingAmount - a.pendingAmount || a.providerName.localeCompare(b.providerName),
      );
      for (const provider of breakdown) {
        provider.lots.sort(
          (a, b) => b.pendingAmount - a.pendingAmount || a.reference.localeCompare(b.reference),
        );
      }

      return {
        id: worker.id,
        name: worker.name,
        hourlyRate: worker.hourlyRate,
        pendingAmount: breakdown.reduce((sum, item) => sum + item.pendingAmount, 0),
        pendingShifts: worker.workShifts.length,
        breakdown,
      };
    });

    const [paid, earned] = await Promise.all([
      this.prisma.payment.aggregate({ where: { voidedAt: null }, _sum: { amount: true } }),
      this.prisma.workShift.aggregate({ _sum: { earnedAmount: true } }),
    ]);

    const totalPending = items.reduce((sum, item) => sum + item.pendingAmount, 0);

    return {
      workers: items,
      totalPending,
      totalPaid: paid._sum.amount ?? 0,
      totalEarned: earned._sum.earnedAmount ?? 0,
    };
  }
}
