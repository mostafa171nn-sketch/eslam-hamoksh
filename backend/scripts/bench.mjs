import fs from 'fs';

// Phase 6 load-test harness (runs against the isolated :4001 instance).
// Zero-dep fetch-based generator so exact p50/p95/p99 come from raw samples.
// Usage: node scripts/bench.mjs <scenarioKey> [outFile] [conns] [dur]
// Scenario keys: baseline, A, B, C, D, all

const BASE = process.env.BENCH_BASE || 'http://localhost:4001';
const CONNECTIONS = parseInt(process.argv[4] || '10', 10);
const DURATION = parseInt(process.argv[5] || '10', 10);
const KEY = process.argv[2];
const OUT_FILE = process.argv[3];

const DEMO = {
  superAdmin: { username: 'demo.super.admin', password: 'Demo@12345' },
  centerAdmin: { username: 'demo.center.admin1', password: 'Demo@12345' },
  teacher: { username: 'demo.teacher.1', password: 'Demo@12345' },
  student: { username: 'demo.student.1', password: 'Demo@12345' },
};

const TEACHER_ID = '1a53376e-ec1f-477c-9cb8-f36346f15860';
const CENTER_ID = '4ffcdfc8-9082-4185-99a4-3885591a674a';

async function login(user) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  if (!res.ok) throw new Error(`login failed for ${user.username}: ${res.status}`);
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const access = setCookie.find((c) => c.startsWith('accessToken='));
  if (!access) throw new Error(`no accessToken cookie for ${user.username}`);
  return { Cookie: access.split(';')[0] };
}

function pct(sorted, q) {
  if (sorted.length === 0) return 0;
  const exact = ((q / 100) * (sorted.length - 1));
  const lo = Math.floor(exact);
  const hi = Math.ceil(exact);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (exact - lo);
}

async function loadEndpoint(path, headers, connections, durationMs) {
  const latencies = [];
  let okCount = 0;
  let non2xx = 0;
  let errors = 0;
  const classCodes = { '2xx': 0, '4xx': 0, '5xx': 0 };
  const deadline = Date.now() + durationMs;

  async function worker() {
    while (Date.now() < deadline) {
      const start = process.hrtime.bigint();
      try {
        const res = await fetch(`${BASE}${path}`, {
          headers,
          redirect: 'manual',
          // Abort docs never hang the pool: a stuck request is counted as an
          // error (like a client timeout) instead of skewing latency bucketing.
          signal: AbortSignal.timeout(45_000),
        });
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        latencies.push(ms);
        if (res.status >= 200 && res.status < 300) okCount++;
        else non2xx++;
        const bucket = `${Math.floor(res.status / 100)}xx`;
        if (bucket in classCodes) classCodes[bucket]++;
        await res.arrayBuffer();
      } catch {
        errors++;
        await new Promise((r) => setTimeout(r, 25));
      }
    }
  }

  await Promise.all(Array.from({ length: connections }, () => worker()));

  const sorted = latencies.slice().sort((a, b) => a - b);
  const total = latencies.length;
  const elapsed = durationMs / 1000;
  return {
    path,
    requests: total,
    reqPerSec: +(total / elapsed).toFixed(2),
    p50: +pct(sorted, 50).toFixed(2),
    p90: +pct(sorted, 90).toFixed(2),
    p95: +pct(sorted, 95).toFixed(2),
    p97_5: +pct(sorted, 97.5).toFixed(2),
    p99: +pct(sorted, 99).toFixed(2),
    p99_9: +pct(sorted, 99.9).toFixed(2),
    min: sorted.length ? +sorted[0].toFixed(2) : 0,
    max: sorted.length ? +sorted[sorted.length - 1].toFixed(2) : 0,
    ok: okCount,
    non2xx,
    errors,
    classCodes,
  };
}

const SCENARIOS = {};

SCENARIOS.baseline = [
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

SCENARIOS.A = [
  { label: 'public:teachers-list', method: 'GET', path: '/api/teachers?limit=12' },
  { label: 'public:teacher-detail', method: 'GET', path: `/api/teachers/${TEACHER_ID}` },
  { label: 'public:center-search', method: 'GET', path: '/api/centers/search?limit=12' },
  { label: 'public:center-detail', method: 'GET', path: `/api/centers/${CENTER_ID}` },
  { label: 'public:center-teachers', method: 'GET', path: `/api/centers/${CENTER_ID}/teachers?limit=12` },
  { label: 'public:teacher-search-name', method: 'GET', path: '/api/teachers?name=Math&limit=12' },
  { label: 'public:teacher-avail', method: 'GET', path: `/api/teachers/${TEACHER_ID}/available-slots` },
  { label: 'catalog:grades', method: 'GET', path: '/api/catalog/grades' },
  { label: 'catalog:locations', method: 'GET', path: '/api/catalog/locations' },
];

SCENARIOS.B = [
  { label: 'auth:me-student', method: 'GET', path: '/api/auth/me', token: 'student' },
  { label: 'student:dashboard', method: 'GET', path: '/api/students/dashboard', token: 'student' },
  { label: 'student:my-teachers', method: 'GET', path: '/api/students/me/teachers', token: 'student' },
  { label: 'student:follows', method: 'GET', path: '/api/students/follows', token: 'student' },
  { label: 'auth:me-teacher', method: 'GET', path: '/api/auth/me', token: 'teacher' },
  { label: 'teacher:lessons', method: 'GET', path: '/api/lessons', token: 'teacher' },
  { label: 'auth:me-admin', method: 'GET', path: '/api/auth/me', token: 'centerAdmin' },
  { label: 'center:dashboard-stats', method: 'GET', path: '/api/center/account/stats', token: 'centerAdmin' },
];

SCENARIOS.C = [
  { label: 'superadmin:centers-all', method: 'GET', path: '/api/centers/admin/all?limit=200', token: 'superAdmin' },
  { label: 'superadmin:platform-stats', method: 'GET', path: '/api/centers/admin/stats', token: 'superAdmin' },
  { label: 'admin:analytics', method: 'GET', path: '/api/admin/analytics', token: 'superAdmin' },
  { label: 'admin:users', method: 'GET', path: '/api/admin/users?limit=20', token: 'superAdmin' },
  { label: 'admin:teachers', method: 'GET', path: '/api/admin/teachers?limit=20', token: 'superAdmin' },
  { label: 'admin:logs', method: 'GET', path: '/api/admin/logs?limit=50', token: 'superAdmin' },
  { label: 'center:employees', method: 'GET', path: '/api/center/staff', token: 'centerAdmin' },
  { label: 'center:payments-stats', method: 'GET', path: '/api/center/account/payments/stats', token: 'centerAdmin' },
];

SCENARIOS.D = [
  { label: 'public:teachers-list', method: 'GET', path: '/api/teachers?limit=12' },
  { label: 'public:center-detail', method: 'GET', path: `/api/centers/${CENTER_ID}` },
  { label: 'public:teacher-detail', method: 'GET', path: `/api/teachers/${TEACHER_ID}` },
  { label: 'public:teacher-search-name', method: 'GET', path: '/api/teachers?name=Math&limit=12' },
  { label: 'public:center-teachers', method: 'GET', path: `/api/centers/${CENTER_ID}/teachers?limit=12` },
  { label: 'catalog:grades', method: 'GET', path: '/api/catalog/grades' },
  { label: 'auth:me-student', method: 'GET', path: '/api/auth/me', token: 'student' },
  { label: 'student:dashboard', method: 'GET', path: '/api/students/dashboard', token: 'student' },
  { label: 'auth:me-teacher', method: 'GET', path: '/api/auth/me', token: 'teacher' },
  { label: 'auth:me-admin', method: 'GET', path: '/api/auth/me', token: 'centerAdmin' },
  { label: 'center:dashboard-stats', method: 'GET', path: '/api/center/account/stats', token: 'centerAdmin' },
  { label: 'superadmin:centers-all', method: 'GET', path: '/api/centers/admin/all?limit=200', token: 'superAdmin' },
];

async function main() {
  if (!KEY || !Object.prototype.hasOwnProperty.call(SCENARIOS, KEY)) {
    if (KEY !== 'all') {
      console.error(`Unknown scenario '${KEY}'. Available: ${Object.keys(SCENARIOS).join(', ')}`);
      process.exit(1);
    }
  }
  const keys = KEY === 'all' ? ['baseline', 'A', 'B', 'C', 'D'] : [KEY];

  const tokens = {};
  for (const [name, cred] of Object.entries(DEMO)) {
    const h = await login(cred);
    tokens[name] = h.Cookie;
  }
  console.log('Logins OK');

  // Keep Neon compute awake: autosuspend (Neon free tier) pauses the compute
  // after ~5 min of idle, and the first requests then pay a multi-second cold
  // start. A background keepalive ping (1 trivial statement) prevents the
  // measurement from being polluted by scale-to-zero, which is a deployment
  // concern, not an app-code latency signal.
  const keepalive = setInterval(async () => {
    try {
      await (await fetch(`${BASE}/api/health`)).arrayBuffer();
    } catch {
      /* ignore keepalive */
    }
  }, 20_000);

  const results = {};
  for (const sc of keys) {
    results[sc] = [];
    for (const ep of SCENARIOS[sc]) {
      const headers = ep.token ? { Cookie: tokens[ep.token] } : undefined;
      try {
        const r = await loadEndpoint(ep.path, headers, CONNECTIONS, DURATION * 1000);
        results[sc].push({ label: ep.label, ...r });
        console.log(
          `[${sc}] ${ep.label} req/s=${r.reqPerSec} p50=${r.p50} p95=${r.p95} p99=${r.p99} 4xx=${r.classCodes['4xx']} 5xx=${r.classCodes['5xx']} err=${r.errors}`,
        );
      } catch (e) {
        console.error(`[${sc}] ${ep.label} FAILED: ${e.message}`);
        results[sc].push({ label: ep.label, path: ep.path, error: e.message });
      }
    }
  }

  const output = JSON.stringify({ base: BASE, connections: CONNECTIONS, duration: DURATION, scenarios: results }, null, 2);
  if (OUT_FILE) {
    fs.writeFileSync(OUT_FILE, output);
    console.log(`\nWrote results to ${OUT_FILE}`);
  } else {
    console.log(output);
  }
  clearInterval(keepalive);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});