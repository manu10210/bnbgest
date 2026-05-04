const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const users = await prisma.user.findMany();
  console.log("Users:", users);
  
  const properties = await prisma.property.findMany();
  console.log("Properties:", properties);
}

test().finally(() => prisma.$disconnect());