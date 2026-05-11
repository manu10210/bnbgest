import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const year = 2026;
  const properties = await prisma.property.findMany();
  const bookings = await prisma.booking.findMany({ where: { status: { not: 'CANCELLED' } } });
  const expenses = await prisma.expense.findMany();

  console.log("PROPERTIES:", properties.length);
  console.log("BOOKINGS:", bookings.length);
  
  if (properties.length > 0) {
      console.log("First property:", properties[0].id, properties[0].name);
      console.log("Bookings for Prop 1:", bookings.filter(b => b.propertyId === properties[0].id).length);
  }

  await prisma.$disconnect();
}
run();