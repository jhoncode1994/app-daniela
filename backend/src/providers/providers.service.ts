import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.provider.findMany({
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) {
      throw new NotFoundException('Proveedor no encontrado');
    }
    return provider;
  }

  create(dto: CreateProviderDto) {
    return this.prisma.provider.create({
      data: {
        name: dto.name.trim(),
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateProviderDto) {
    await this.findOne(id);
    return this.prisma.provider.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const shiftCount = await this.prisma.workShift.count({ where: { providerId: id } });
    if (shiftCount > 0) {
      throw new ConflictException(
        'No se puede eliminar porque tiene jornadas. Desactívelo o renómbrelo.',
      );
    }
    await this.prisma.payment.updateMany({
      where: { providerId: id },
      data: { providerId: null },
    });
    await this.prisma.provider.delete({ where: { id } });
    return { deleted: true };
  }
}
