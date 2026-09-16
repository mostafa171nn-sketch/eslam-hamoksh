import fs from 'fs';

// Captures statements during a login -> refresh cycle for <user>.
// Usage: node scripts/p7-refreshstream.mjs <user> <outfile>
const BASE = 'http://localhost:4002';
const LOG = 'load-4002.log';
const user = process.argv[2];
const OUT = process.argv[3];
const CREDS = {
  'demo.super.admin': { username: 'demo.super.admin', password: 'Demo@12345' },
  'demo.student.1': { username: 'demo.student.1', password: 'Demo@12345' },
};

function readFrom(offset) {
  const cur = fs.statSync(LOG).size;
  const buf = Buffer.alloc(cur);
  const fd = fs.openSync(LOG, 'r');
  fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);
  const out = [];
  for (const l of buf.toString('utf8').split('\n')) {
    const m = l.match(/^\[q\] (.+) \(([\d.]+) ms\)\s*$/);
    if (m) out.push(`${m[1]}  (${m[2]} ms)`);
  }
  return out;
}

async function main() {
  const cred = CREDS[user];
  const before = fs.statSync(LOG).size;
  const res = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cred) });
  const cookies = (res.headers.getSetCookie ? res.headers.getSetCookie() : []).map((c) => c.split(';')[0]);
  await res.arrayBuffer();
  const refreshRes = await fetch(`${BASE}/api/auth/refresh`, { method: 'POST', headers: { Cookie: cookies.join('; ') } });
  await refreshRes.arrayBuffer();
  await new Promise((r) => setTimeout(r, 400));
  const lines = readFrom(before);
  const norm = lines.map((l) => l.replace(/\s+\(\d+(\.\d+)? ms\)\s*$/, ''));
  fs.writeFileSync(OUT, norm.join('\n'));
  console.log(`wrote ${norm.length} statements to ${OUT} (refresh status ${refreshRes.status})`);
}
main().catch((e) => { console.error(e); process.exit(1); });