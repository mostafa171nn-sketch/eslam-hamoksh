import fs from 'fs';

// Captures the [q] SQL lines produced by login + auth:me for a single user
// from the :4002 PRISMA_LOG instance, so before/after statement sequences can
// be diffed exactly.
// Usage: node scripts/p7-querystream.mjs <username> <outfile>

const BASE = process.env.QCOUNT_BASE || 'http://localhost:4002';
const LOG = process.env.QCOUNT_LOG || 'load-4002.log';
const user = process.argv[2];
const OUT = process.argv[3];

const CREDS = {
  'demo.super.admin': { username: 'demo.super.admin', password: 'Demo@12345' },
  'demo.center.admin1': { username: 'demo.center.admin1', password: 'Demo@12345' },
  'demo.teacher.1': { username: 'demo.teacher.1', password: 'Demo@12345' },
  'demo.student.1': { username: 'demo.student.1', password: 'Demo@12345' },
};

function readLinesFrom(offset) {
  const cur = fs.statSync(LOG).size;
  const buf = Buffer.alloc(cur);
  const fd = fs.openSync(LOG, 'r');
  fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);
  const lines = buf.toString('utf8').split('\n');
  const out = [];
  let acc = 0;
  for (const l of lines) {
    if (acc + l.length < offset) { acc += l.length + 1; continue; }
    acc += l.length + 1;
    const m = l.match(/^\[q\] (.+) \(([\d.]+) ms\)\s*$/);
    if (m) out.push(`${m[1]}  (${m[2]} ms)`);
  }
  return out;
}

async function main() {
  if (!user || !OUT || !CREDS[user]) { console.error('usage: node p7-querystream.mjs <user> <out>'); process.exit(1); }
  const cred = CREDS[user];
  const before = fs.statSync(LOG).size;
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cred),
  });
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const cookie = setCookie.find((c) => c.startsWith('accessToken='))?.split(';')[0];
  await res.arrayBuffer();
  const meRes = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: cookie } });
  await meRes.arrayBuffer();
  await new Promise((r) => setTimeout(r, 400));
  const lines = readLinesFrom(before);
  fs.writeFileSync(OUT, lines.join('\n'));
  console.log(`wrote ${lines.length} statements to ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });