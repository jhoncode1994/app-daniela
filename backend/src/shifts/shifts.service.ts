import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { calculateShift, dateOnlyToString, toDateOnly } from '../common/time-money';
import { PrismaService } from '../prisma/prisma.service';
import { QueryShiftsDto } from './dto/query-shifts.dto';
import { ShiftInputDto } from './dto/shift-input.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(dto: ShiftInputDto) {
    const worker = await this.requireActiveWorker(dto.workerId);
    const calculation = calculateShift({
      startTime: dto.startTime,
      endTime: dto.endTime,
      mealBreakMinutes: dto.mealBreakMinutes,
      hourlyRate: worker.hourlyRate,
    });
    return {
      worker: { id: worker.id, name: worker.name },
      workDate: dto.workDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      ...calculation,
    };
  }

  async create(dto: ShiftInputDto) {
    const worker = await this.requireActiveWorker(dto.workerId);
    const calculation = calculateShift({
      startTime: dto.startTime,
      endTime: dto.endTime,
      mealBreakMinutes: dto.mealBreakMinutes,
      hourlyRate: worker.hourlyRate,
    });

    const shift = await this.prisma.workShift.create({
      data: {
        workerId: worker.id,
        workDate: toDateOnly(dto.workDate),
        startTime: dto.startTime,
        endTime: dto.endTime,
        mealBreakMinutes: calculation.mealBreakMinutes,
        grossMinutes: calculation.grossMinutes,
        netMinutes: calculation.netMinutes,
        hourlyRate: calculation.hourlyRate,
        earnedAmount: calculation.earnedAmount,
        paymentStatus: PaymentStatus.PENDIENTE,
      },
      include: { worker: true },
    });
    return this.serialize(shift);
  }

  async findAll(query: QueryShiftsDto) {
    const where: Prisma.WorkShiftWhereInput = {};
    if (query.workerId) {
      where.workerId = query.workerId;
    }
    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }
    if (query.from || query.to) {
      where.workDate = {};
      if (query.from) {
        where.workDate.gte = toDateOnly(query.from);
      }
      if (query.to) {
        where.workDate.lte = toDateOnly(query.to);
      }
    }

    const shifts = await this.prisma.workShift.findMany({
      where,
      include: { worker: true },
      orderBy: [{ workDate: 'desc' }, { startTime: 'desc' }],
    });
    return shifts.map((shift) => this.serialize(shift));
  }

  async findOne(id: string) {
    const shift = await this.prisma.workShift.findUnique({
      where: { id },
      include: { worker: true },
    });
    if (!shift) {
      throw new NotFoundException('Jornada no encontrada');
    }
    return this.serialize(shift);
  }

  async update(id: string, dto: UpdateShiftDto) {
    const shift = await this.prisma.workShift.findUnique({ where: { id } });
    if (!shift) {
      throw new NotFoundException('Jornada no encontrada');
    }
    if (shift.paymentStatus === PaymentStatus.PAGADA) {
      throw new ConflictException('No se puede editar una jornada que ya fue pagada');
    }

    const startTime = dto.startTime ?? shift.startTime;
    const endTime = dto.endTime ?? shift.endTime;
    const mealBreakMinutes = dto.mealBreakMinutes ?? shift.mealBreakMinutes;
    const workDate = dto.workDate ?? dateOnlyToString(shift.workDate);

    const calculation = calculateShift({
      startTime,
      endTime,
      mealBreakMinutes,
      hourlyRate: shift.hourlyRate,
    });

    const updated = await this.prisma.workShift.update({
      where: { id },
      data: {
        workDate: toDateOnly(workDate),
        startTime,
        endTime,
        mealBreakMinutes: calculation.mealBreakMinutes,
        grossMinutes: calculation.grossMinutes,
        netMinutes: calculation.netMinutes,
        earnedAmount: calculation.earnedAmount,
      },
      include: { worker: true },
    });
    return this.serialize(updated);
  }

  async remove(id: string) {
    const shift = await this.prisma.workShift.findUnique({ where: { id } });
    if (!shift) {
      throw new NotFoundException('Jornada no encontrada');
    }
    if (shift.paymentStatus === PaymentStatus.PAGADA) {
      throw new ConflictException('No se puede eliminar una jornada que ya fue pagada');
    }
    await this.prisma.workShift.delete({ where: { id } });
    return { deleted: true };
  }

  private async requireActiveWorker(id: string) {
    const worker = await this.prisma.worker.findUnique({ where: { id } });
    if (!worker) {
      throw new NotFoundException('Trabajadora no encontrada');
    }
    if (!worker.active) {
      throw new BadRequestException('La trabajadora está inactiva');
    }
    return worker;
  }

  private serialize(shift: {
    id: string;
    workerId: string;
    workDate: Date;
    startTime: string;
    endTime: string;
    mealBreakMinutes: number;
    grossMinutes: number;
    netMinutes: number;
    hourlyRate: number;
    earnedAmount: number;
    paymentStatus: PaymentStatus;
    createdAt: Date;
    updatedAt: Date;
    worker: { id: string; name: string };
  }) {
    return {
      ...shift,
      workDate: dateOnlyToString(shift.workDate),
    };
  }
}
