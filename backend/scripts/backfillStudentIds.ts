import crypto from 'crypto';
import { prisma } from '../src/lib/prisma';
import { ApiError } from '../src/utils/ApiError';

/** Collision-safe Student ID generator in the format STU-XXXXXX (6 digits). */
async function generateStudentNumber(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const num = `STU-${String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')}`;
    const existing = await prisma.student.findUnique({ where: { studentNumber: num } });
    if (!existing) return num;
  }
  throw ApiError.internal('Could not allocate a student number. Please try again.');
}

async function main() {
  const students = await prisma.student.findMany({
    where: {
      OR: [{ studentNumber: null }, { studentNumber: { not: { startsWith: 'STU-' } } }],
    },
    select: { id: true, studentNumber: true },
  });

  console.log(`Found ${students.length} student(s) without a STU- Student ID.`);

  let updated = 0;
  for (const student of students) {
    const studentNumber = await generateStudentNumber();
    await prisma.student.update({ where: { id: student.id }, data: { studentNumber } });
    updated += 1;
    console.log(`Updated student ${student.id}: ${studentNumber}`);
  }

  console.log(`Done. ${updated} student(s) updated with a STU- Student ID.`);

  const remaining = await prisma.student.count({
    where: { OR: [{ studentNumber: null }, { studentNumber: { not: { startsWith: 'STU-' } } }] },
  });
  if (remaining > 0) {
    console.error(`WARNING: ${remaining} student(s) still do not have a STU- Student ID.`);
    process.exit(1);
  } else {
    console.log('All students now have a STU- Student ID.');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
