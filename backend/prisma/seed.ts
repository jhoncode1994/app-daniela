import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
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
