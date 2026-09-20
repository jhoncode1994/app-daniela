import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { dateOnlyToString, toDateOnly, todayInBogota } from '../common/time-money';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SettlementQueryDto } from './dto/settlement-query.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(query: SettlementQueryDto) {
    const worker = await this.requireWorker(query.workerId);
    const provider = await this.requireProvider(query.providerId);
    if (query.from > query.to) {
      throw new BadRequestException('La fecha inicial no puede ser mayor que la final');
    }

    const shifts = await this.prisma.workShift.findMany({
      where: {
        workerId: query.workerId,
        providerId: query.providerId,
        endTime: { not: null },
        workDate: {
          gte: toDateOnly(query.from),
          lte: toDateOnly(query.to),
        },
      },
      include: { provider: true },
      orderBy: [{ workDate: 'asc' }, { startTime: 'asc' }],
    });

    const totals = shifts.reduce(
      (acc, shift) => {
        acc.grossMinutes += shift.grossMinutes;
        acc.mealMinutes += shift.mealBreakMinutes;
        acc.netMinutes += shift.netMinutes;
        acc.earnedAmount += shift.earnedAmount;
        if (shift.paymentStatus === PaymentStatus.PAGADA) {
          acc.paidAmount += shift.earnedAmount;
        } else {
          acc.pendingAmount += shift.earnedAmount;
          acc.pendingShiftIds.push(shift.id);
        }
        return acc;
      },
      {
        grossMinutes: 0,
        mealMinutes: 0,
        netMinutes: 0,
        earnedAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        pendingShiftIds: [] as string[],
      },
    );

    return {
      worker: { id: worker.id, name: worker.name },
      provider: { id: provider.id, name: provider.name },
      from: query.from,
      to: query.to,
      ...totals,
      pendingShiftCount: totals.pendingShiftIds.length,
      shifts: shifts.map((shift) => ({
        ...shift,
        workDate: dateOnlyToString(shift.workDate),
        provider: { id: shift.provider.id, name: shift.provider.name },
      })),
    };
  }

  async create(dto: CreatePaymentDto) {
    const preview = await this.preview(dto);
    if (preview.pendingShiftCount === 0) {
      throw new BadRequestException('No hay jornadas pendientes en el periodo seleccionado');
    }

    const paymentDate = dto.paymentDate ?? todayInBogota();

    return this.prisma.$transaction(async (tx) => {
      const pending = await tx.workShift.findMany({
        where: {
          id: { in: preview.pendingShiftIds },
          paymentStatus: PaymentStatus.PENDIENTE,
          providerId: dto.providerId,
        },
      });

      if (pending.length !== preview.pendingShiftIds.length) {
        throw new BadRequestException(
          'Algunas jornadas ya fueron pagadas. Vuelva a consultar la liquidación.',
        );
      }

      const amount = pending.reduce((sum, shift) => sum + shift.earnedAmount, 0);
      const payment = await tx.payment.create({
        data: {
          workerId: dto.workerId,
          providerId: dto.providerId,
          paymentDate: toDateOnly(paymentDate),
          amount,
          paymentShifts: {
            create: pending.map((shift) => ({ shiftId: shift.id })),
          },
        },
        include: {
          worker: true,
          provider: true,
          paymentShifts: { include: { shift: true } },
        },
      });

      await tx.workShift.updateMany({
        where: { id: { in: pending.map((shift) => shift.id) } },
        data: { paymentStatus: PaymentStatus.PAGADA },
      });

      return this.serializePayment(payment);
    });
  }

  async findAll(workerId?: string, providerId?: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        ...(workerId ? { workerId } : {}),
        ...(providerId ? { providerId } : {}),
      },
      include: {
        worker: true,
        provider: true,
        paymentShifts: { include: { shift: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return payments.map((payment) => this.serializePayment(payment));
  }

  private async requireWorker(id: string) {
    const worker = await this.prisma.worker.findUnique({ where: { id } });
    if (!worker) {
      throw new NotFoundException('Trabajadora no encontrada');
    }
    return worker;
  }

  private async requireProvider(id: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) {
      throw new NotFoundException('Proveedor no encontrado');
    }
    return provider;
  }

  private serializePayment(payment: {
    id: string;
    workerId: string;
    providerId: string | null;
    paymentDate: Date;
    amount: number;
    createdAt: Date;
    worker: { id: string; name: string };
    provider: { id: string; name: string } | null;
    paymentShifts: {
      shiftId: string;
      shift: {
        workDate: Date;
        startTime: string;
        endTime: string | null;
        mealBreakMinutes: number;
        grossMinutes: number;
        netMinutes: number;
        hourlyRate: number;
        earnedAmount: number;
      };
    }[];
  }) {
    const shifts = payment.paymentShifts
      .map(({ shiftId, shift }) => ({
        id: shiftId,
        workDate: dateOnlyToString(shift.workDate),
        startTime: shift.startTime,
        endTime: shift.endTime,
        mealBreakMinutes: shift.mealBreakMinutes,
        grossMinutes: shift.grossMinutes,
        netMinutes: shift.netMinutes,
        hourlyRate: shift.hourlyRate,
        earnedAmount: shift.earnedAmount,
      }))
      .sort((a, b) =>
        `${a.workDate} ${a.startTime}`.localeCompare(`${b.workDate} ${b.startTime}`),
      );

    return {
      id: payment.id,
      workerId: payment.workerId,
      worker: payment.worker,
      providerId: payment.providerId,
      provider: payment.provider,
      paymentDate: dateOnlyToString(payment.paymentDate),
      amount: payment.amount,
      createdAt: payment.createdAt,
      shiftIds: payment.paymentShifts.map((item) => item.shiftId),
      shiftCount: payment.paymentShifts.length,
      shifts,
    };
  }
}
