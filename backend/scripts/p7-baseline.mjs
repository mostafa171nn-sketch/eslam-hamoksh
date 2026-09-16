import fs from 'fs';

// Phase 7 baseline: statement counts + raw response bodies for the auth path
// (login + auth:me per role) against the :4002 PRISMA_LOG instance.
// Usage: node scripts/p7-baseline.mjs [outDir]
// Writes outDir/counts.json and outDir/body-<endpoint>.json

const BASE = process.env.QCOUNT_BASE || 'http://localhost:4002';
const LOG = process.env.QCOUNT_LOG || 'load-4002.log';
const OUT_DIR = process.argv[2] || '.p7baseline';

const DEMO = {
  superAdmin: { username: 'demo.super.admin', password: 'Demo@12345' },
  centerAdmin: { username: 'demo.center.admin1', password: 'Demo@12345' },
  teacher: { username: 'demo.teacher.1', password: 'Demo@12345' },
  student: { username: 'demo.student.1', password: 'Demo@12345' },
};

function countIn(log, fromOffset) {
  const cur = fs.statSync(log).size;
  const buf = Buffer.alloc(cur);
  const fd = fs.openSync(log, 'r');
  fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);
  const lines = buf.toString('utf8').split('\n');
  let stmts = 0;
  let totalDurationMs = 0;
  let acc = 0;
  for (const l of lines) {
    if (acc + l.length < fromOffset) {
      acc += l.length + 1;
      continue;
    }
    acc += l.length + 1;
    const m = l.match(/^\[q\] (.+) \(([\d.]+) ms\)\s*$/);
    if (m) {
      stmts++;
      totalDurationMs += parseFloat(m[2]);
    }
  }
  return { stmts, totalDurationMs };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = [];

  for (const [name, cred] of Object.entries(DEMO)) {
    // login
    {
      const before = fs.statSync(LOG).size;
      const t0 = performance.now();
      let status = 0;
      let bodyText = '';
      let res;
      try {
        res = await fetch(`${BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cred),
        });
        status = res.status;
        bodyText = await res.text();
      } catch {
        status = -1;
      }
      const wallMs = +(performance.now() - t0).toFixed(1);
      await new Promise((r) => setTimeout(r, 200));
      const { stmts, totalDurationMs } = countIn(LOG, before);
      const body = status === 200 ? JSON.parse(bodyText) : null;
      fs.writeFileSync(`${OUT_DIR}/body-login-${name}.json`, JSON.stringify(body, null, 2));
      const cookie = status === 200
        ? res.headers.getSetCookie().find((c) => c.startsWith('accessToken=')).split(';')[0]
        : null;
      out.push({ endpoint: `login:${name}`, status, wallMs, stmts, dbMs: +totalDurationMs.toFixed(1) });
      console.log(`[login:${name}] status=${status} wall=${wallMs}ms stmts=${stmts} dbMs=${totalDurationMs.toFixed(1)}`);

      // auth:me
      const before2 = fs.statSync(LOG).size;
      const t1 = performance.now();
      let status2 = 0;
      let bodyText2 = '';
      try {
        const res2 = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: cookie } });
        status2 = res2.status;
        bodyText2 = await res2.text();
      } catch {
        status2 = -1;
      }
      const wallMs2 = +(performance.now() - t1).toFixed(1);
      await new Promise((r) => setTimeout(r, 200));
      const { stmts: s2, totalDurationMs: d2 } = countIn(LOG, before2);
      const body2 = status2 === 200 ? JSON.parse(bodyText2) : null;
      fs.writeFileSync(`${OUT_DIR}/body-me-${name}.json`, JSON.stringify(body2, null, 2));
      out.push({ endpoint: `auth:me-${name}`, status: status2, wallMs: wallMs2, stmts: s2, dbMs: +d2.toFixed(1) });
      console.log(`[auth:me-${name}] status=${status2} wall=${wallMs2}ms stmts=${s2} dbMs=${d2.toFixed(1)}`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  fs.writeFileSync(`${OUT_DIR}/counts.json`, JSON.stringify(out, null, 2));
  console.log(`\nWrote to ${OUT_DIR}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});