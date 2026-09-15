import fs from 'fs';

// Measures per-endpoint DB query count + cumulative duration by reading the
// PRISMA_LOG=query stream of the :4002 instrumented instance.
// Usage: node scripts/qcount.mjs [outJSON]
// Endpoints come from cnt/SCENARIOS below (single request each, warmup first).

const BASE = process.env.QCOUNT_BASE || 'http://localhost:4002';
const LOG = process.env.QCOUNT_LOG || 'load-4002.log';
const OUT = process.argv[2];

const DEMO = {
  superAdmin: { username: 'demo.super.admin', password: 'Demo@12345' },
  centerAdmin: { username: 'demo.center.admin1', password: 'Demo@12345' },
  teacher: { username: 'demo.teacher.1', password: 'Demo@12345' },
  student: { username: 'demo.student.1', password: 'Demo@12345' },
};
const TEACHER_ID = '1a53376e-ec1f-477c-9cb8-f36346f15860';
const CENTER_ID = '4ffcdfc8-9082-4185-99a4-3885591a674a';

const ENDPOINTS = [
  { label: 'health', method: 'GET', path: '/api/health' },
  { label: 'catalog:grades', method: 'GET', path: '/api/catalog/grades' },
  { label: 'catalog:locations', method: 'GET', path: '/api/catalog/locations' },
  { label: 'public:teachers-list', method: 'GET', path: '/api/teachers?limit=12' },
  { label: 'public:teacher-detail', method: 'GET', path: `/api/teachers/${TEACHER_ID}` },
  { label: 'public:center-detail', method: 'GET', path: `/api/centers/${CENTER_ID}` },
  { label: 'public:center-teachers', method: 'GET', path: `/api/centers/${CENTER_ID}/teachers?limit=12` },
  { label: 'public:teacher-search-name', method: 'GET', path: '/api/teachers?name=Math&limit=12' },
  { label: 'auth:me-student', method: 'GET', path: '/api/auth/me', token: 'student' },
  { label: 'student:dashboard', method: 'GET', path: '/api/students/dashboard', token: 'student' },
];

async function login(user) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const a = setCookie.find((c) => c.startsWith('accessToken='));
  return { Cookie: a.split(';')[0] };
}

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
    // skip lines that start before the captured offset
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
  const tokens = {};
  for (const [name, cred] of Object.entries(DEMO)) {
    // login emits its own queries; do it before measuring so the offset is clean
    tokens[name] = (await login(cred)).Cookie;
  }
  const out = [];
  for (const ep of ENDPOINTS) {
    const before = fs.existsSync(LOG) ? fs.statSync(LOG).size : 0;
    const headers = ep.token ? { Cookie: tokens[ep.token] } : undefined;
    const t0 = performance.now();
    let status = 0;
    try {
      const res = await fetch(`${BASE}${ep.path}`, { headers });
      status = res.status;
      await res.arrayBuffer();
    } catch (e) {
      status = -1;
    }
    const wallMs = +(performance.now() - t0).toFixed(1);
    // small settle for log flush
    await new Promise((r) => setTimeout(r, 200));
    const { stmts, totalDurationMs } = countIn(LOG, before);
    out.push({ label: ep.label, path: ep.path, status, wallMs, stmts, dbMs: +totalDurationMs.toFixed(1) });
    console.log(
      `[${ep.label}] status=${status} wall=${wallMs}ms stmts=${stmts} dbMs=${totalDurationMs.toFixed(1)}`,
    );
  }
  const json = JSON.stringify(out, null, 2);
  if (OUT) fs.writeFileSync(OUT, json);
  else console.log(json);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});