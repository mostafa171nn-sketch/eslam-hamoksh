const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const teacherId = '889b0040-a5ec-45c5-b405-e10ad2176241';
  const dateStr = '2026-08-21';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  console.log('parsed getDay():', date.getDay());
  const teacher = await p.teacher.findUnique({ where: { id: teacherId } });
  console.log('teacher found:', !!teacher, '| userId:', teacher && teacher.userId);
  const availability = await p.teacherAvailability.findMany({ where: { teacherId: teacher.id, day: date.getDay() } });
  console.log('availability rows:', availability.length);
  console.log('rows:', JSON.stringify(availability.map((a) => ({ day: a.day, startTime: a.startTime, endTime: a.endTime }))));
  const slot = availability.find((a) => a.startTime === '16:00');
  console.log('slot match:', !!slot);
  await p.$disconnect();
})().catch((e) => { console.log('ERR', e.message); process.exit(1); });
