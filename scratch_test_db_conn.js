const dotenv = require('dotenv');
dotenv.config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.slice(0, 30) + '...' : 'none');
  try {
    const res = await prisma.$queryRaw`SELECT count(*) FROM "transactions"`;
    console.log('Postgres count result:', res);
  } catch (err) {
    console.log('Postgres error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
