const app_1 = require('./dist/app');
const { env } = require('./dist/config/env');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function start() {
  try {
    await prisma.$connect();
    console.log('Database connected.');
    const server = app_1.app.listen(env.PORT, () => {
      console.log('API running on http://localhost:' + env.PORT);
    });
    server.on('error', (err) => console.error('Server error:', err));
    server.on('listening', () => console.log('Server is listening'));
  } catch (err) {
    console.error('Error:', err);
  }
}
start();