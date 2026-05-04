const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function main() { 
  const b = await prisma.booking.findMany({ 
    where: { 
      OR: [
        { confirmationCode: { contains: 'HMPAHKSHKN', mode: 'insensitive' } }, 
        { specialRequests: { contains: 'HMPAHKSHKN', mode: 'insensitive' } }
      ] 
    } 
  }); 
  console.log(JSON.stringify(b, null, 2)); 
} 

main().finally(() => prisma.$disconnect());
