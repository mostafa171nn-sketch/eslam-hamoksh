const base = 'http://localhost:4000/api';

async function post(path, body, jar) {
  const res = await fetch(base + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), credentials: 'include',
  });
  const sc = res.headers.get('set-cookie'); if (sc && jar) jar.push(sc);
  let d; try { d = await res.json(); } catch { d = await res.text(); }
  return { status: res.status, data: d };
}
async function get(path, jar) {
  const headers = {}; if (jar && jar.length) headers['Cookie'] = jar.map(c => c.split(';')[0]).join('; ');
  const res = await fetch(base + path, { method: 'GET', headers, credentials: 'include' });
  let d; try { d = await res.json(); } catch { d = await res.text(); }
  return { status: res.status, data: d };
}
async function login(email, pw) { const j = []; const r = await post('/auth/login', { email, password: pw }, j); return { jar: j, status: r.status, user: r.data?.data?.user }; }

(async () => {
  const sa = await login('mostafa171@gmail.com', '7Amoksha@22');
  const ca = await login('centeradmin@maarech.demo', 'Center@123');
  const te = await login('ahmed.teacher@maarech.demo', 'Teacher@123');

  console.log('--- SUPER_ADMIN only endpoints (centers/admin/*) ---');
  console.log('SA /centers/admin/stats :', (await get('/centers/admin/stats', sa.jar)).status);
  const all = await get('/centers/admin/all', sa.jar);
  console.log('SA /centers/admin/all   :', all.status, 'centers=', all.data?.data?.items?.length);
  const firstId = all.data?.data?.items?.[0]?.id;
  if (firstId) console.log('SA /centers/admin/:id  :', (await get('/centers/admin/' + firstId, sa.jar)).status);

  console.log('--- CENTER_ADMIN must be blocked from super-admin endpoints ---');
  console.log('CA /centers/admin/stats :', (await get('/centers/admin/stats', ca.jar)).status, '(expect 403)');
  console.log('CA /centers/admin/all   :', (await get('/centers/admin/all', ca.jar)).status, '(expect 403)');

  console.log('--- TEACHER must be blocked from admin + super-admin endpoints ---');
  console.log('TE /admin/stats         :', (await get('/admin/stats', te.jar)).status, '(expect 403)');
  console.log('TE /centers/admin/all   :', (await get('/centers/admin/all', te.jar)).status, '(expect 403)');

  console.log('--- CENTER_ADMIN admin area works (tenant-scoped) ---');
  console.log('CA /admin/users         :', (await get('/admin/users', ca.jar)).status);
  console.log('CA /admin/teachers      :', (await get('/admin/teachers', ca.jar)).status);

  console.log('--- PUBLIC browsing (no auth) ---');
  console.log('noauth /centers/search  :', (await get('/centers/search?q=')).status);
  console.log('noauth /teachers        :', (await get('/teachers')).status);
  console.log('noauth /centers         :', (await get('/centers')).status);
  console.log('noauth /subjects        :', (await get('/subjects')).status);

  console.log('--- password reset (must not leak) ---');
  const fp = await post('/auth/forgot-password', { usernameOrEmail: 'mostafa171@gmail.com' });
  console.log('forgot-password         :', fp.status, 'msg=', fp.data?.data?.message || fp.data?.message);
  console.log('forgot (unknown user)   :', (await post('/auth/forgot-password', { usernameOrEmail: 'ghost@x.com' })).status);
})();
