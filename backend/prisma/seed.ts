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
