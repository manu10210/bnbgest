const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const res = await prisma.$queryRawUnsafe(`SELECT pid, query as statement FROM pg_stat_activity WHERE state = 'active' OR wait_event_type = 'Lock';`);
    console.log(res);
    for (const r of res) {
      if (r.pid !== process.pid) { // Wait, process.pid is node, this is db pid. We just kill all of them
          try {
             await prisma.$executeRawUnsafe(`SELECT pg_terminate_backend(${r.pid});`);
             console.log(`Killed pid ${r.pid}`);
          } catch(e) {}
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();