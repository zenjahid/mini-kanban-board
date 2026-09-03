import { PrismaClient, BoardRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: { email: 'alice@example.com', name: 'Alice', password },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: { email: 'bob@example.com', name: 'Bob', password },
  });

  const existing = await prisma.board.findFirst({
    where: { ownerId: alice.id, name: 'Product Roadmap' },
  });

  if (!existing) {
    await prisma.board.create({
      data: {
        name: 'Product Roadmap',
        ownerId: alice.id,
        members: {
          create: [
            { userId: alice.id, role: BoardRole.OWNER },
            { userId: bob.id, role: BoardRole.EDITOR },
          ],
        },
        columns: {
          create: [
            {
              name: 'Backlog',
              position: 1000,
              tasks: {
                create: [
                  { title: 'Research competitors', position: 1000 },
                  { title: 'Write PRD', position: 2000 },
                ],
              },
            },
            {
              name: 'In Progress',
              position: 2000,
              tasks: {
                create: [{ title: 'Design system sketch', position: 1000 }],
              },
            },
            {
              name: 'Done',
              position: 3000,
              tasks: {
                create: [{ title: 'Set up repo', position: 1000 }],
              },
            },
          ],
        },
      },
    });
  }

  console.log('Seed complete. Demo users:');
  console.log('  alice@example.com / password123  (board owner)');
  console.log('  bob@example.com   / password123  (shared editor)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });