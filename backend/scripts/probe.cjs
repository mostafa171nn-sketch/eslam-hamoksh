const base = 'http://localhost:4000/api';

async function post(path, body, jar) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie && jar) jar.push(setCookie);
  let data;
  try { data = await res.json(); } catch { data = await res.text(); }
  return { status: res.status, data };
}

async function get(path, jar) {
  const headers = {};
  if (jar && jar.length) headers['Cookie'] = jar.map(c => c.split(';')[0]).join('; ');
  const res = await fetch(base + path, { method: 'GET', headers, credentials: 'include' });
  let data;
  try { data = await res.json(); } catch { data = await res.text(); }
  return { status: res.status, data };
}

const accounts = [
  { name: 'SUPER_ADMIN', email: 'mostafa171@gmail.com', password: '7Amoksha@22' },
  { name: 'CENTER_ADMIN', email: 'centeradmin@maarech.demo', password: 'Center@123' },
  { name: 'TEACHER', email: 'ahmed.teacher@maarech.demo', password: 'Teacher@123' },
  { name: 'STUDENT', email: 'ahmed.student@maarech.demo', password: 'Student@123' },
  { name: 'PARENT', email: 'ahmed.parent@maarech.demo', password: 'Parent@123' },
];

(async () => {
  for (const acc of accounts) {
    const jar = [];
    const login = await post('/auth/login', { email: acc.email, password: acc.password }, jar);
    const ok = login.status === 200;
    const role = login.data?.data?.user?.role;
    const hasAdminObj = !!login.data?.data?.user?.admin;
    const stats = ok ? await get('/admin/stats', jar) : null;
    console.log(
      `${acc.name.padEnd(13)} login=${login.status} role=${role || '-'} ` +
      `adminObj=${hasAdminObj} profileHasSuperAdminFlag=${!!login.data?.data?.user?.superAdmin} ` +
      `adminStats=${stats ? stats.status : 'n/a'}`,
    );
  }

  console.log('\n--- error cases (SUPER_ADMIN creds) ---');
  console.log('wrong password:', (await post('/auth/login', { email: 'mostafa171@gmail.com', password: 'wrong' })).status);
  console.log('missing password:', (await post('/auth/login', { email: 'mostafa171@gmail.com' })).status);
  console.log('missing email:', (await post('/auth/login', { password: '7Amoksha@22' })).status);
  console.log('bad email format (still logs in?):', (await post('/auth/login', { email: 'not-an-email', password: 'x' })).status);
  console.log('nonexistent user:', (await post('/auth/login', { email: 'nobody@x.com', password: 'x' })).status);

  console.log('\n--- unauthorized access (no cookie) ---');
  console.log('GET /admin/stats no auth:', (await get('/admin/stats')).status);
  console.log('GET /admin/users no auth:', (await get('/admin/users')).status);
})();
