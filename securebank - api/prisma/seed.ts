import { PrismaClient, Role, AccountType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('Admin@SecureBank1!', 12);
  const customerPassword = await bcrypt.hash('Customer@SecureBank1!', 12);

  await prisma.user.upsert({
    where: { email: 'admin@securebank.com' },
    update: {},
    create: {
      email: 'admin@securebank.com',
      passwordHash: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: Role.ADMIN,
      isEmailVerified: true,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@securebank.com' },
    update: {},
    create: {
      email: 'customer@securebank.com',
      passwordHash: customerPassword,
      firstName: 'Jane',
      lastName: 'Doe',
      role: Role.CUSTOMER,
      isEmailVerified: true,
    },
  });

  await prisma.account.upsert({
    where: { accountNumber: 'SB-0000000001' },
    update: {},
    create: {
      userId: customer.id,
      accountNumber: 'SB-0000000001',
      type: AccountType.CHECKING,
      balance: 5000.0,
      currency: 'USD',
    },
  });

  await prisma.account.upsert({
    where: { accountNumber: 'SB-0000000002' },
    update: {},
    create: {
      userId: customer.id,
      accountNumber: 'SB-0000000002',
      type: AccountType.SAVINGS,
      balance: 25000.0,
      currency: 'USD',
    },
  });

  console.log('Seed complete.');
  console.log(`Admin:    admin@securebank.com / Admin@SecureBank1!`);
  console.log(`Customer: customer@securebank.com / Customer@SecureBank1!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
