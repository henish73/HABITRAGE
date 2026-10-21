const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const count = await prisma.transaction.count();
    console.log('Postgres transaction count:', count);
    const first = await prisma.transaction.findFirst();
    console.log('First tx in PG:', first ? first.merchant : 'none');
  } catch (err) {
    console.log('Postgres error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
