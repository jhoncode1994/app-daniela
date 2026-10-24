import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const providerCount = await prisma.provider.count();
  if (providerCount === 0) {
    await prisma.provider.createMany({
      data: [
        { name: 'Alma Rosa', active: true },
        { name: 'Bizcocho', active: true },
      ],
    });
  }

  // Sin referencias no se pueden registrar horas: se deja una de ejemplo por proveedor.
  const lotCount = await prisma.lot.count();
  if (lotCount === 0) {
    const providers = await prisma.provider.findMany({ where: { active: true } });
    for (const provider of providers) {
      await prisma.lot.create({
        data: {
          providerId: provider.id,
          reference: 'REF-1',
          notes: 'Referencia de ejemplo; renómbrela o dele de baja.',
          units: 0,
          unitPrice: 0,
        },
      });
    }
  }

  const existing = await prisma.worker.count();
  if (existing > 0) {
    return;
  }

  await prisma.worker.createMany({
    data: [
      { name: 'María', hourlyRate: 6000, active: true },
      { name: 'Ana', hourlyRate: 6000, active: true },
    ],
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
