const { app } = require('./src/app');
const { env } = require('./src/config/env');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.$connect();
    console.log('Database connected.');
    
    const server = app.listen(4000, () => {
      console.log('API running on http://localhost:4000');
    });
    
    server.on('error', (err) => {
      console.error('Server error:', err);
    });
    
    server.on('listening', () => {
      console.log('Server is listening');
    });
  } catch (err) {
    console.error('Error:', err);
  }
}
test();