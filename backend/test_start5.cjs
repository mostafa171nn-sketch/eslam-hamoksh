const app_1 = require('./dist/app');
const { env } = require('./dist/config/env');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

async function start() {
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Database connected.');
    
    console.log('Starting server on port', env.PORT);
    const server = app_1.app.listen(env.PORT, () => {
      console.log('API running on http://localhost:' + env.PORT);
    });
    
    server.on('error', (err) => console.error('Server error:', err));
    server.on('listening', () => console.log('Server is listening on port', server.address()));
    
    // Check server address immediately
    setTimeout(() => {
      console.log('Server address:', server.address());
    }, 1000);
    
    // Keep process alive
    setInterval(() => {}, 1000);
  } catch (err) {
    console.error('Error:', err);
  }
}
start();