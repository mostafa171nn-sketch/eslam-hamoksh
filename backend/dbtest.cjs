const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.teacher.count().then((c) => {
  console.log('teacher count', c);
  return p.$disconnect();
}).catch((e) => {
  console.error('DB ERR', e.message);
  process.exit(1);
});
