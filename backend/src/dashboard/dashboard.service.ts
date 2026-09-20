import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const workers = await this.prisma.worker.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        workShifts: {
          select: {
            paymentStatus: true,
            earnedAmount: true,
            endTime: true,
          },
        },
      },
    });

    const items = workers.map((worker) => {
      const closedPending = worker.workShifts.filter(
        (shift) => shift.paymentStatus === PaymentStatus.PENDIENTE && shift.endTime !== null,
      );
      const pendingAmount = closedPending.reduce((sum, shift) => sum + shift.earnedAmount, 0);
      const pendingShifts = closedPending.length;
      return {
        id: worker.id,
        name: worker.name,
        hourlyRate: worker.hourlyRate,
        pendingAmount,
        pendingShifts,
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
