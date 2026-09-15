import { app } from '../src/app';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';

async function start() {
  await prisma.$connect();
  app.listen(env.PORT, () => {
    console.log(`Load-test API (no sweepers) running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
}

start().catch((err) => {
  console.error('Failed to start load-test server:', err);
  process.exit(1);
});