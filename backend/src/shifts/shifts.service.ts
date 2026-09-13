import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { calculateShift, dateOnlyToString, toDateOnly } from '../common/time-money';
import { PrismaService } from '../prisma/prisma.service';
import { BatchShiftsDto } from './dto/batch-shifts.dto';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { QueryShiftsDto } from './dto/query-shifts.dto';
import { ShiftInputDto } from './dto/shift-input.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

const shiftInclude = {
  worker: true,
  provider: true,
} as const;

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(dto: ShiftInputDto) {
    const worker = await this.requireActiveWorker(dto.workerId);
    const provider = await this.requireActiveProvider(dto.providerId);
    const calculation = calculateShift({
      startTime: dto.startTime,
      endTime: dto.endTime,
      mealBreakMinutes: dto.mealBreakMinutes,
      hourlyRate: worker.hourlyRate,
    });
    return {
      worker: { id: worker.id, name: worker.name },
      provider: { id: provider.id, name: provider.name },
      workDate: dto.workDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      ...calculation,
    };
  }

  async previewBatch(dto: BatchShiftsDto) {
    const worker = await this.requireActiveWorker(dto.workerId);
    const provider = await this.requireActiveProvider(dto.providerId);
    const segments = dto.segments.map((segment) => {
      const calculation = calculateShift({
        startTime: segment.startTime,
        endTime: segment.endTime,
        mealBreakMinutes: segment.mealBreakMinutes,
        hourlyRate: worker.hourlyRate,
      });
      return {
        startTime: segment.startTime,
        endTime: segment.endTime,
        ...calculation,
      };
    });

    return {
      worker: { id: worker.id, name: worker.name },
      provider: { id: provider.id, name: provider.name },
      workDate: dto.workDate,
      segments,
      totals: {
        grossMinutes: segments.reduce((sum, item) => sum + item.grossMinutes, 0),
        mealBreakMinutes: segments.reduce((sum, item) => sum + item.mealBreakMinutes, 0),
        netMinutes: segments.reduce((sum, item) => sum + item.netMinutes, 0),
        hourlyRate: worker.hourlyRate,
        earnedAmount: segments.reduce((sum, item) => sum + item.earnedAmount, 0),
      },
    };
  }

  async create(dto: ShiftInputDto) {
    const worker = await this.requireActiveWorker(dto.workerId);
    const provider = await this.requireActiveProvider(dto.providerId);
    return this.createForWorker(worker, provider, dto);
  }

  async createBatch(dto: BatchShiftsDto) {
    const worker = await this.requireActiveWorker(dto.workerId);
    const provider = await this.requireActiveProvider(dto.providerId);
    const created: Awaited<ReturnType<ShiftsService['createForWorker']>>[] = [];
    for (const segment of dto.segments) {
      created.push(
        await this.createForWorker(worker, provider, {
          workerId: dto.workerId,
          providerId: dto.providerId,
          workDate: dto.workDate,
          startTime: segment.startTime,
          endTime: segment.endTime,
          mealBreakMinutes: segment.mealBreakMinutes,
        }),
      );
    }
    return created;
  }

  async clockIn(dto: ClockInDto) {
    const worker = await this.requireActiveWorker(dto.workerId);
    const provider = await this.requireActiveProvider(dto.providerId);
    const open = await this.findOpenShift(worker.id);
    if (open) {
      throw new ConflictException(
        `Ya hay un ingreso abierto a las ${open.startTime} (${dateOnlyToString(open.workDate)}). Registre la salida primero.`,
      );
    }

    const shift = await this.prisma.workShift.create({
      data: {
        workerId: worker.id,
        providerId: provider.id,
        workDate: toDateOnly(dto.workDate),
        startTime: dto.startTime,
        endTime: null,
        mealBreakMinutes: 0,
        grossMinutes: 0,
        netMinutes: 0,
        hourlyRate: worker.hourlyRate,
        earnedAmount: 0,
        paymentStatus: PaymentStatus.PENDIENTE,
      },
      include: shiftInclude,
    });
    return this.serialize(shift);
  }

  async clockOut(dto: ClockOutDto) {
    const worker = await this.requireActiveWorker(dto.workerId);
    const open = await this.findOpenShift(worker.id);
    if (!open) {
      throw new BadRequestException('No hay un ingreso abierto para esta trabajadora');
    }
    if (open.paymentStatus === PaymentStatus.PAGADA) {
      throw new ConflictException('No se puede cerrar una jornada que ya fue pagada');
    }

    const mealBreakMinutes = dto.mealBreakMinutes ?? 0;
    const calculation = calculateShift({
      startTime: open.startTime,
      endTime: dto.endTime,
      mealBreakMinutes,
      hourlyRate: open.hourlyRate,
    });

    const updated = await this.prisma.workShift.update({
      where: { id: open.id },
      data: {
        endTime: dto.endTime,
        mealBreakMinutes: calculation.mealBreakMinutes,
        grossMinutes: calculation.grossMinutes,
        netMinutes: calculation.netMinutes,
        earnedAmount: calculation.earnedAmount,
      },
      include: shiftInclude,
    });
    return this.serialize(updated);
  }

  async findOpenForWorker(workerId: string) {
    await this.requireActiveWorker(workerId);
    const open = await this.findOpenShift(workerId);
    return open ? this.serialize(open) : null;
  }

  private async createForWorker(
    worker: { id: string; name: string; hourlyRate: number },
    provider: { id: string; name: string },
    dto: ShiftInputDto,
  ) {
    const calculation = calculateShift({
      startTime: dto.startTime,
      endTime: dto.endTime,
      mealBreakMinutes: dto.mealBreakMinutes,
      hourlyRate: worker.hourlyRate,
    });

    const shift = await this.prisma.workShift.create({
      data: {
        workerId: worker.id,
        providerId: provider.id,
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
      include: shiftInclude,
    });
    return this.serialize(shift);
  }

  async findAll(query: QueryShiftsDto) {
    const where: Prisma.WorkShiftWhereInput = {};
    if (query.workerId) {
      where.workerId = query.workerId;
    }
    if (query.providerId) {
      where.providerId = query.providerId;
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
      include: shiftInclude,
      orderBy: [{ workDate: 'desc' }, { startTime: 'desc' }],
    });
    return shifts.map((shift) => this.serialize(shift));
  }

  async findOne(id: string) {
    const shift = await this.prisma.workShift.findUnique({
      where: { id },
      include: shiftInclude,
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
    const endTime = dto.endTime !== undefined ? dto.endTime : shift.endTime;
    const mealBreakMinutes = dto.mealBreakMinutes ?? shift.mealBreakMinutes;
    const workDate = dto.workDate ?? dateOnlyToString(shift.workDate);

    if (!endTime) {
      const updated = await this.prisma.workShift.update({
        where: { id },
        data: {
          workDate: toDateOnly(workDate),
          startTime,
          endTime: null,
          mealBreakMinutes: 0,
          grossMinutes: 0,
          netMinutes: 0,
          earnedAmount: 0,
        },
        include: shiftInclude,
      });
      return this.serialize(updated);
    }

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
      include: shiftInclude,
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

  private async findOpenShift(workerId: string) {
    return this.prisma.workShift.findFirst({
      where: { workerId, endTime: null },
      include: shiftInclude,
      orderBy: [{ workDate: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
    });
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

  private async requireActiveProvider(id: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) {
      throw new NotFoundException('Proveedor no encontrado');
    }
    if (!provider.active) {
      throw new BadRequestException('El proveedor está inactivo');
    }
    return provider;
  }

  private serialize(shift: {
    id: string;
    workerId: string;
    providerId: string;
    workDate: Date;
    startTime: string;
    endTime: string | null;
    mealBreakMinutes: number;
    grossMinutes: number;
    netMinutes: number;
    hourlyRate: number;
    earnedAmount: number;
    paymentStatus: PaymentStatus;
    createdAt: Date;
    updatedAt: Date;
    worker: { id: string; name: string };
    provider: { id: string; name: string };
  }) {
    return {
      ...shift,
      workDate: dateOnlyToString(shift.workDate),
      open: shift.endTime === null,
      worker: { id: shift.worker.id, name: shift.worker.name },
      provider: { id: shift.provider.id, name: shift.provider.name },
    };
  }
}
