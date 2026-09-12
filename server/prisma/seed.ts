import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  let admin = await prisma.user.findUnique({ where: { email: 'admin@nexxflow.com' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: { email: 'admin@nexxflow.com', name: 'Admin', password: await bcrypt.hash('admin123', 10), role: Role.ADMIN },
    });
  }

  let member = await prisma.user.findUnique({ where: { email: 'member@nexxflow.com' } });
  if (!member) {
    member = await prisma.user.create({
      data: { email: 'member@nexxflow.com', name: 'Team Member', password: await bcrypt.hash('member123', 10), role: Role.TEAM_MEMBER },
    });
  }

  console.log('Seeded users:', admin.email, member.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
