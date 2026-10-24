import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLotDto } from './dto/create-lot.dto';
import { QueryLotsDto } from './dto/query-lots.dto';
import { UpdateLotDto } from './dto/update-lot.dto';

const lotInclude = {
  provider: true,
} as const;

type LotRow = {
  id: string;
  providerId: string;
  reference: string;
  notes: string | null;
  units: number;
  unitPrice: number;
  closed: boolean;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  provider: { id: string; name: string };
};

type LotTotals = {
  laborPaid: number;
  laborPending: number;
  paidShifts: number;
  pendingShifts: number;
};

@Injectable()
export class LotsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryLotsDto) {
    const where: Prisma.LotWhereInput = {};
    if (query.providerId) {
      where.providerId = query.providerId;
    }
    if (query.closed !== undefined) {
      where.closed = query.closed;
    }

    const lots = await this.prisma.lot.findMany({
      where,
      include: lotInclude,
      orderBy: [{ closed: 'asc' }, { createdAt: 'desc' }],
    });
    const totals = await this.totalsFor(lots.map((lot) => lot.id));
    return lots.map((lot) => this.serialize(lot, totals.get(lot.id)));
  }

  async findOne(id: string) {
    const lot = await this.prisma.lot.findUnique({ where: { id }, include: lotInclude });
    if (!lot) {
      throw new NotFoundException('Referencia no encontrada');
    }
    const totals = await this.totalsFor([id]);
    return this.serialize(lot, totals.get(id));
  }

  async create(dto: CreateLotDto) {
    const provider = await this.prisma.provider.findUnique({ where: { id: dto.providerId } });
    if (!provider) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    const reference = dto.reference.trim();
    const duplicated = await this.prisma.lot.findFirst({
      where: { providerId: dto.providerId, reference },
    });
    if (duplicated) {
      throw new ConflictException(`${provider.name} ya tiene la referencia ${reference}`);
    }

    const closed = dto.closed ?? false;
    const lot = await this.prisma.lot.create({
      data: {
        providerId: dto.providerId,
        reference,
        notes: dto.notes?.trim() || null,
        units: dto.units ?? 0,
        unitPrice: dto.unitPrice ?? 0,
        closed,
        closedAt: closed ? new Date() : null,
      },
      include: lotInclude,
    });
    return this.serialize(lot);
  }

  async update(id: string, dto: UpdateLotDto) {
    const current = await this.prisma.lot.findUnique({ where: { id }, include: lotInclude });
    if (!current) {
      throw new NotFoundException('Referencia no encontrada');
    }

    if (dto.reference !== undefined) {
      const reference = dto.reference.trim();
      const duplicated = await this.prisma.lot.findFirst({
        where: { providerId: current.providerId, reference, id: { not: id } },
      });
      if (duplicated) {
        throw new ConflictException(
          `${current.provider.name} ya tiene la referencia ${reference}`,
        );
      }
    }

    const lot = await this.prisma.lot.update({
      where: { id },
      data: {
        ...(dto.reference !== undefined ? { reference: dto.reference.trim() } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
        ...(dto.units !== undefined ? { units: dto.units } : {}),
        ...(dto.unitPrice !== undefined ? { unitPrice: dto.unitPrice } : {}),
        ...(dto.closed !== undefined
          ? { closed: dto.closed, closedAt: dto.closed ? (current.closedAt ?? new Date()) : null }
          : {}),
      },
      include: lotInclude,
    });
    const totals = await this.totalsFor([id]);
    return this.serialize(lot, totals.get(id));
  }

  async remove(id: string) {
    await this.findOne(id);
    const shiftCount = await this.prisma.workShift.count({ where: { lotId: id } });
    if (shiftCount > 0) {
      throw new ConflictException(
        'No se puede eliminar porque tiene jornadas. Dele de baja para que deje de aparecer al registrar horas.',
      );
    }
    await this.prisma.payment.updateMany({ where: { lotId: id }, data: { lotId: null } });
    await this.prisma.lot.delete({ where: { id } });
    return { deleted: true };
  }

  // Mano de obra de cada referencia: lo ya pagado y lo que falta por pagar.
  private async totalsFor(ids: string[]): Promise<Map<string, LotTotals>> {
    const totals = new Map<string, LotTotals>();
    if (ids.length === 0) {
      return totals;
    }

    const grouped = await this.prisma.workShift.groupBy({
      by: ['lotId', 'paymentStatus'],
      where: { lotId: { in: ids }, endTime: { not: null } },
      _sum: { earnedAmount: true },
      _count: { _all: true },
    });

    for (const row of grouped) {
      if (!row.lotId) {
        continue;
      }
      const current =
        totals.get(row.lotId) ??
        { laborPaid: 0, laborPending: 0, paidShifts: 0, pendingShifts: 0 };
      const amount = row._sum.earnedAmount ?? 0;
      if (row.paymentStatus === PaymentStatus.PAGADA) {
        current.laborPaid += amount;
        current.paidShifts += row._count._all;
      } else {
        current.laborPending += amount;
        current.pendingShifts += row._count._all;
      }
      totals.set(row.lotId, current);
    }

    return totals;
  }

  private serialize(lot: LotRow, totals?: LotTotals) {
    const laborPaid = totals?.laborPaid ?? 0;
    const laborPending = totals?.laborPending ?? 0;
    const laborTotal = laborPaid + laborPending;
    const value = lot.units * lot.unitPrice;

    return {
      ...lot,
      provider: { id: lot.provider.id, name: lot.provider.name },
      value,
      laborPaid,
      laborPending,
      laborTotal,
      profit: value - laborTotal,
      paidShifts: totals?.paidShifts ?? 0,
      pendingShifts: totals?.pendingShifts ?? 0,
    };
  }
}
