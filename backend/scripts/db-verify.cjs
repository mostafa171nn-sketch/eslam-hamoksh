const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const tables = await p.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    console.log('=== TABLES (' + tables.length + ') ===');
    tables.forEach(t => console.log(t.tablename));

    const enums = await p.$queryRawUnsafe("SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname");
    console.log('\n=== ENUMS (' + enums.length + ') ===');
    enums.forEach(e => console.log(e.typname));

    const indexes = await p.$queryRawUnsafe("SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname");
    console.log('\n=== INDEXES (' + indexes.length + ') ===');
    indexes.forEach(i => console.log(i.indexname));

    // Count records in key tables
    const tables_to_count = ['User', 'Teacher', 'Student', 'Parent', 'Center', 'Subject', 'Grade', 'Location', 'Room', 'Permission', 'RolePermission', 'NotificationTemplate', 'SubscriptionPlan'];
    console.log('\n=== KEY TABLE COUNTS ===');
    for (const t of tables_to_count) {
      try {
        const count = await p[t].count();
        console.log(t + ': ' + count);
      } catch (e) {
        console.log(t + ': ERROR - ' + e.message);
      }
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await p.$disconnect();
  }
})();
