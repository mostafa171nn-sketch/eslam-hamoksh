const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const KEY_TABLES = ['User', 'Teacher', 'Student', 'Parent', 'Center', 'Subject', 'Grade', 'Location', 'Room', 'Permission', 'RolePermission', 'NotificationTemplate', 'SubscriptionPlan', 'Lesson', 'Attendance', 'Assignment', 'Exam', 'Rating', 'Wallet', 'WalletTransaction', 'Conversation', 'Message'];

async function getCounts(label) {
  console.log('\n=== ' + label + ' ===');
  const counts = {};
  for (const t of KEY_TABLES) {
    try {
      counts[t] = await p[t].count();
      console.log(t + ': ' + counts[t]);
    } catch (e) {
      counts[t] = -1;
      console.log(t + ': ERROR');
    }
  }
  return counts;
}

(async () => {
  try {
    const before = await getCounts('BEFORE SEED');
    const beforeJson = JSON.stringify(before);

    // Run seed
    const { execSync } = require('child_process');
    console.log('\n>>> Running seed...');
    const result = execSync('npx tsx prisma/seed.ts', { cwd: process.cwd(), encoding: 'utf-8', stdio: 'pipe' });
    console.log(result);
    console.log('>>> Seed complete.');

    const after1 = await getCounts('AFTER SEED #1');
    const after1Json = JSON.stringify(after1);

    // Check for duplicates by running seed again
    console.log('\n>>> Running seed AGAIN for idempotency test...');
    const result2 = execSync('npx tsx prisma/seed.ts', { cwd: process.cwd(), encoding: 'utf-8', stdio: 'pipe' });
    console.log(result2);
    console.log('>>> Seed #2 complete.');

    const after2 = await getCounts('AFTER SEED #2');
    const after2Json = JSON.stringify(after2);

    console.log('\n=== IDEMPOTENCY ANALYSIS ===');
    const after1Obj = JSON.parse(after1Json);
    const after2Obj = JSON.parse(after2Json);
    let hasDupes = false;
    for (const t of KEY_TABLES) {
      if (after1Obj[t] !== after2Obj[t]) {
        console.log('DUPLICATE DETECTED in ' + t + ': ' + after1Obj[t] + ' -> ' + after2Obj[t]);
        hasDupes = true;
      }
    }
    if (!hasDupes) {
      console.log('SEED IS IDEMPOTENT - No duplicate records created.');
    }

    console.log('\n=== CHANGES (before -> after seed #1) ===');
    const beforeObj = JSON.parse(beforeJson);
    for (const t of KEY_TABLES) {
      if (beforeObj[t] !== after1Obj[t]) {
        console.log(t + ': ' + beforeObj[t] + ' -> ' + after1Obj[t] + ' (+' + (after1Obj[t] - beforeObj[t]) + ')');
      }
    }

  } catch (e) {
    console.error('ERROR:', e.message);
    if (e.stdout) console.log('STDOUT:', e.stdout);
    if (e.stderr) console.error('STDERR:', e.stderr);
  } finally {
    await p.$disconnect();
  }
})();
