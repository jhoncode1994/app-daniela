import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
    const [shiftCount, paymentCount] = await Promise.all([
      this.prisma.workShift.count({ where: { workerId: id } }),
      this.prisma.payment.count({ where: { workerId: id } }),
    ]);
    if (shiftCount > 0 || paymentCount > 0) {
      throw new ConflictException(
        'No se puede eliminar porque tiene jornadas o pagos. Desactívela en su lugar.',
      );
    }
    await this.prisma.worker.delete({ where: { id } });
    return { deleted: true };
  }
}
