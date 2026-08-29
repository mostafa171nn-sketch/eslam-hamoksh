/**
 * Initial Super Admin seed — idempotent.
 * Creates username "7Amoksh" with role SUPER_ADMIN if it does not already exist.
 * Uses the project's existing Argon2id hashing (src/utils/password.ts).
 * Does NOT modify existing users, does NOT delete, does NOT expose password in logs.
 *
 * Usage (production Neon):
 *   DATABASE_URL="postgresql://..." npx tsx prisma/seed-superadmin.ts
 * or
 *   npm run seed:superadmin
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
  const username = '7Amoksh';
  const email = '7amoksh@admin.local';
  // Password is intentionally not logged. Hashing uses existing Argon2id.
  const plainPassword = '7Amoksh';

  // Idempotency: check by username (unique) first
  const existingByUsername = await prisma.user.findUnique({ where: { username } });
  if (existingByUsername) {
    let needsUpdate = false;
    const updates: Record<string, unknown> = {};
    if (existingByUsername.role !== 'SUPER_ADMIN') {
      needsUpdate = true;
      (updates as any).role = 'SUPER_ADMIN';
    }
    if (existingByUsername.status !== 'ACTIVE') {
      needsUpdate = true;
      (updates as any).status = 'ACTIVE';
    }
    if ((existingByUsername as any).email !== email) {
      // Ensure email is set for email-login fallback; do not overwrite if already correctly set
      needsUpdate = true;
      (updates as any).email = email;
    }
    let passwordOk = false;
    try {
      passwordOk = await verifyPassword(existingByUsername.passwordHash, plainPassword);
    } catch {
      passwordOk = false;
    }
    if (!passwordOk) {
      needsUpdate = true;
      (updates as any).passwordHash = await hashPassword(plainPassword);
    }
    if (!needsUpdate && passwordOk) {
      console.log(`Super Admin "${username}" already exists (role=${existingByUsername.role}, status=${existingByUsername.status}). No update needed.`);
      return;
    }
    const updated = await prisma.user.update({
      where: { username },
      data: updates as any,
    });
    console.log(`Super Admin "${username}" updated (role=${updated.role}, status=${updated.status}).`);
    return;
  }

  // Guard by email only to avoid accidental duplicate email if username check missed (email is not unique in schema, but we warn)
  const existingByEmail = await prisma.user.findFirst({ where: { email } });
  if (existingByEmail) {
    console.log(`User with email "${email}" already exists (username="${existingByEmail.username}"). Proceeding to create "${username}" anyway (email not unique).`);
  }

  const passwordHash = await hashPassword(plainPassword);

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      fullName: 'Super Admin',
      phone: '01000000007',
      email,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log(`Super Admin created: username="${user.username}" role=${user.role} id=${user.id}`);
}

main()
  .catch((e) => {
    console.error('Failed to seed Super Admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
