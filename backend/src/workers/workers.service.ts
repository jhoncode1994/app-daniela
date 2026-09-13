import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';

@Injectable()
export class WorkersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.worker.findMany({
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const worker = await this.prisma.worker.findUnique({ where: { id } });
    if (!worker) {
      throw new NotFoundException('Trabajadora no encontrada');
    }
    return worker;
  }

  create(dto: CreateWorkerDto) {
    return this.prisma.worker.create({
      data: {
        name: dto.name.trim(),
        hourlyRate: dto.hourlyRate,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateWorkerDto) {
    await this.findOne(id);
    return this.prisma.worker.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.hourlyRate !== undefined ? { hourlyRate: dto.hourlyRate } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.$transaction(async (tx) => {
      const shifts = await tx.workShift.findMany({
        where: { workerId: id },
        select: { id: true },
      });
      const shiftIds = shifts.map((shift) => shift.id);

      if (shiftIds.length > 0) {
        await tx.paymentShift.deleteMany({
          where: { shiftId: { in: shiftIds } },
        });
      }

      await tx.paymentShift.deleteMany({
        where: { payment: { workerId: id } },
      });
      await tx.payment.deleteMany({ where: { workerId: id } });
      await tx.workShift.deleteMany({ where: { workerId: id } });
      await tx.worker.delete({ where: { id } });
    });

    return { deleted: true };
  }
}
