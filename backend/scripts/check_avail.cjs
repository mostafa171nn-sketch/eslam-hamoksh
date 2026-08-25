const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const a = await p.teacherAvailability.findFirst({ where: { day: 6 } });
  console.log('raw startTime:', JSON.stringify(a && a.startTime), '| endTime:', JSON.stringify(a && a.endTime));
  const l = await p.lesson.findFirst({ orderBy: { createdAt: 'desc' } });
  console.log('sample lesson startTime:', JSON.stringify(l && l.startTime), '| date:', JSON.stringify(l && l.date));
  await p.$disconnect();
})().catch((e) => { console.log('ERR', e.message); process.exit(1); });
