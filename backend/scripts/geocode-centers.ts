import { prisma } from '../src/lib/prisma';
import { geocodeAddress, geocodeAddressRaw, buildGeocodeQuery, sleep } from '../src/services/geocoding';

/**
 * Backfill missing center coordinates by geocoding each center's saved address.
 *
 * Usage: npm run geocode:centers [-- --all]
 *
 * By default only Centers with latitude/longitude both null are processed.
 * Pass --all to also re-geocode centers that already have coordinates (and
 * overwrite them). Rate limiting (1 req/s) and a per-center cache are enforced.
 */
async function main() {
  const all = process.argv.includes('--all');

  const where = all
    ? {}
    : { latitude: null, longitude: null };

  const centers = await prisma.center.findMany({
    where,
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      latitude: true,
      longitude: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${centers.length} center(s) to process${all ? ' (--all mode)' : ''}.`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const center of centers) {
    const query = buildGeocodeQuery({
      name: center.name,
      address: center.address,
      city: center.city,
      country: 'Egypt',
    });

    if (!query.trim()) {
      console.log(`  [skip] ${center.id} — no usable address.`);
      skipped += 1;
      continue;
    }

    const outcome = await geocodeAddressRaw(query);
    if (outcome.status === 'success') {
      await prisma.center.update({
        where: { id: center.id },
        data: { latitude: outcome.result.latitude, longitude: outcome.result.longitude },
      });
      updated += 1;
      console.log(
        `  [ok]   ${center.id} — "${center.name}" → (${outcome.result.latitude}, ${outcome.result.longitude})`,
      );
    } else if (outcome.status === 'empty') {
      console.log(`  [none] ${center.id} — "${center.name}" — no result found.`);
      failed += 1;
    } else {
      console.log(`  [fail] ${center.id} — "${center.name}" — ${outcome.reason}.`);
      failed += 1;
    }

    // Respect Nominatim's ~1 request/second usage policy.
    await sleep(1100);
  }

  console.log('\nDone.');
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (no address): ${skipped}`);
  console.log(`  Failed / not found:   ${failed}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
