import http from 'node:http';

// PHASE 7 auth + security regression for the modified endpoints
// (login / refresh / me). Run against the load instance (:4001) which
// carries the elevated rate limits and the new pruned-SELECT code.
const BASE = process.env.P7_BASE || 'http://localhost:4001';
let passed = 0;
let failed = 0;
const failures = [];

function request(method, path, body, cookies = '', contentType = 'application/json', header = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE);
    const headers = { 'Content-Type': contentType };
    if (cookies) headers['Cookie'] = cookies;
    if (header) Object.assign(headers, header);
    if (body && typeof body === 'object') body = JSON.stringify(body);
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.status || res.statusCode, json, raw: data, headers: res.headers, setCookies: res.headers['set-cookie'] || [] });
      });
    });
    req.on('error', (e) => resolve({ status: 0, json: null, error: e.message }));
    if (body) req.write(body);
    req.end();
  });
}

function assert(label, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS: ${label}`);
  } else {
    failed++;
    failures.push({ label, detail });
    console.log(`  FAIL: ${label}${detail ? ' | ' + detail : ''}`);
  }
}

function extractCookies(setCookies) {
  return setCookies.map((c) => c.split(';')[0]).join('; ');
}

async function loginAs(username, password) {
  const res = await request('POST', '/api/auth/login', { username, password });
  return { ...res, cookies: extractCookies(res.setCookies) };
}

console.log('=== P7 AUTH + SECURITY REGRESSION ===');

// ---------- LOGIN ----------
console.log('\n--- Login ---');
let superAdmin, centerAdmin, teacher, student, parent;
{
  superAdmin = await loginAs('demo.super.admin', 'Demo@12345');
  assert('superAdmin login 200', superAdmin.status === 200, `got ${superAdmin.status} ${superAdmin.raw?.substring(0, 200)}`);
  assert('superAdmin sets accessToken cookie', superAdmin.cookies.includes('accessToken='));
  assert('superAdmin sets refreshToken cookie', superAdmin.cookies.includes('refreshToken='));
  assert('login body has user + center shape', superAdmin.json?.data?.user?.username === 'demo.super.admin' || superAdmin.json?.data?.riskLevel !== undefined);

  centerAdmin = await loginAs('demo.center.admin1', 'Demo@12345');
  assert('centerAdmin login 200', centerAdmin.status === 200, `got ${centerAdmin.status}`);

  teacher = await loginAs('demo.teacher.1', 'Demo@12345');
  assert('teacher login 200', teacher.status === 200, `got ${teacher.status}`);

  student = await loginAs('demo.student.1', 'Demo@12345');
  assert('student login 200', student.status === 200, `got ${student.status}`);

  const parentLogin = await loginAs('demo.parent.1', 'Demo@12345');
  parent = parentLogin;
  console.log(`  INFO: parent login status=${parentLogin.status}`);

  const wrongPass = await request('POST', '/api/auth/login', { username: 'demo.student.1', password: 'wrong' });
  assert('wrong password 401', wrongPass.status === 401, `got ${wrongPass.status}`);

  const unknown = await request('POST', '/api/auth/login', { username: 'no.such.user.x', password: 'Demo@12345' });
  assert('unknown user 401 (no 404/500)', unknown.status === 401, `got ${unknown.status}`);

  const missing = await request('POST', '/api/auth/login', { username: 'demo.student.1' });
  assert('missing password rejected (4xx)', missing.status >= 400 && missing.status < 500, `got ${missing.status}`);
}

// ---------- /me ALL ROLES + NO PASSWORDHASH ----------
console.log('\n--- /me role + leakage checks ---');
{
  const roles = [
    ['demo.super.admin', 'SUPER_ADMIN', superAdmin],
    ['demo.center.admin1', 'CENTER_ADMIN', centerAdmin],
    ['demo.teacher.1', 'TEACHER', teacher],
    ['demo.student.1', 'STUDENT', student],
  ];
  for (const [u, role, sess] of roles) {
    const me = await request('GET', '/api/auth/me', null, sess.cookies);
    assert(`/me ${u} 200 + role ${role}`, me.status === 200 && me.json?.data?.role === role, `got ${me.status} role=${me.json?.data?.role}`);
    const serialized = JSON.stringify(me.json);
    assert(`/me ${u} no passwordHash`, !serialized.includes('passwordHash'), 'passwordHash in response!');
  }
}

// ---------- TOKEN EDGE CASES ----------
console.log('\n--- Token edge cases ---');
{
  const noToken = await request('GET', '/api/auth/me');
  assert('no token 401', noToken.status === 401, `got ${noToken.status}`);

  const garbage = await request('GET', '/api/auth/me', null, 'accessToken=garbage.token.value');
  assert('garbage token 401', garbage.status === 401, `got ${garbage.status}`);

  const malformed = await request('GET', '/api/auth/me', null, 'accessToken=abc');
  assert('malformed token 401', malformed.status === 401, `got ${malformed.status}`);

  const tmpered = await request('GET', '/api/auth/me', null, student.cookies.replace(/accessToken=[^;]+/, 'accessToken=' + student.cookies.match(/accessToken=([^;]+)/)[1].slice(0, -4) + 'xxxx'));
  assert('tampered token 401', tmpered.status === 401, `got ${tmpered.status}`);

  const bearer = await request('GET', '/api/auth/me', null, '', 'application/json', { Authorization: `Bearer ${student.cookies.match(/accessToken=([^;]+)/)[1]}` });
  assert('bearer auth 200', bearer.status === 200, `got ${bearer.status}`);
}

// ---------- REFRESH ----------
console.log('\n--- Refresh ---');
{
  const ref = await request('POST', '/api/auth/refresh', null, student.cookies);
  assert('refresh 200', ref.status === 200, `got ${ref.status} ${ref.raw?.substring(0, 200)}`);
  assert('refresh rotates cookies', ref.setCookies.some((c) => c.startsWith('accessToken=')) && ref.setCookies.some((c) => c.startsWith('refreshToken=')));

  const newCookies = extractCookies(ref.setCookies);
  const meNew = await request('GET', '/api/auth/me', null, newCookies);
  assert('new access token works for /me', meNew.status === 200, `got ${meNew.status}`);

  const reuseOld = await request('POST', '/api/auth/refresh', null, student.cookies);
  assert('old refresh token reuse rejected', reuseOld.status === 401, `got ${reuseOld.status}`);

  const refreshNoCookie = await request('POST', '/api/auth/refresh');
  assert('refresh without token 401', refreshNoCookie.status === 401, `got ${refreshNoCookie.status}`);

  const refreshGarbage = await request('POST', '/api/auth/refresh', null, 'refreshToken=not.a.jwt');
  assert('refresh garbage token 401', refreshGarbage.status === 401, `got ${refreshGarbage.status}`);
}

// ---------- RBAC SPOT CHECK ON MODIFIED PATH ----------
console.log('\n--- RBAC spot check (login/me reachable per role) ---');
{
  // centerAdmin must not see student-only data via /me - just confirm role correct
  const ca = await request('GET', '/api/auth/me', null, centerAdmin.cookies);
  assert('CA /me = CENTER_ADMIN', ca.json?.data?.role === 'CENTER_ADMIN');

  // anonymous restricted endpoint
  const anon = await request('GET', '/api/students/dashboard');
  assert('anonymous protected route 401', anon.status === 401, `got ${anon.status}`);
}

// ---------- SECURITY ----------
console.log('\n--- Security ---');
{
  const sqli = await request('POST', '/api/auth/login', { username: "admin'; DROP TABLE users; --", password: 'test' });
  assert('SQLi attempt no 500', sqli.status !== 500, `got ${sqli.status}`);

  const xss = await request('GET', '/api/teachers?name=<script>alert(1)</script>&limit=12');
  assert('XSS param does not crash', xss.status === 200, `got ${xss.status}`);

  const me = await request('GET', '/api/auth/me', null, superAdmin.cookies);
  assert('no passwordHash in /me response', !JSON.stringify(me.json).includes('passwordHash'));

  assert('login sets httpOnly on access cookie', superAdmin.setCookies.some((c) => c.startsWith('accessToken=') && c.toLowerCase().includes('httponly')));

  const gitignore = 'C:\\Users\\MSI\\Desktop\\eslam-hamoksh\\.gitignore';
  const gi = (await import('node:fs')).readFileSync(gitignore, 'utf-8');
  assert('.env ignored by git', gi.includes('.env') || gi.includes('*.env'));
}

console.log('\n' + '='.repeat(50));
console.log(`P7 AUTH/SEC REGRESSION: PASSED=${passed} FAILED=${failed}`);
console.log('='.repeat(50));
if (failures.length) {
  for (const f of failures) console.log(`  - ${f.label}: ${f.detail}`);
  process.exit(1);
}