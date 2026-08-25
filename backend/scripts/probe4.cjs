const base = 'http://localhost:4000/api';

async function post(path, body, jar) {
  const headers = { 'Content-Type': 'application/json' };
  if (jar && jar.length) headers['Cookie'] = jar.map(c => c.split(';')[0]).join('; ');
  const res = await fetch(base + path, { method: 'POST', headers, body: body ? JSON.stringify(body) : undefined, credentials: 'include' });
  const sc = res.headers.get('set-cookie'); if (sc && jar) jar.push(sc);
  let d; try { d = await res.json(); } catch { d = await res.text(); }
  return { status: res.status, data: d };
}
const rnd = () => Math.random().toString(36).slice(2, 8);

(async () => {
  const sa = []; await post('/auth/login', { email: 'mostafa171@gmail.com', password: '7Amoksha@22' }, sa);

  // Register a center and approve it as SUPER_ADMIN (cookie correctly sent)
  const cReg = await post('/centers/register', {
    name: 'Approve Test ' + rnd(), adminFullName: 'Owner', adminUsername: 'own_' + rnd(),
    adminPhone: '01012345671', adminPassword: 'Test1234', email: '', adminEmail: '',
  });
  const cid = cReg.data.data.centerId;
  console.log('center register:', cReg.status, 'id=', cid);
  const approve = await post('/centers/admin/' + cid + '/approve', {}, sa);
  console.log('SA approve center:', approve.status, approve.data.data?.message || approve.data.message);
  const getC = await (async () => {
    const headers = { 'Cookie': sa.map(c => c.split(';')[0]).join('; ') };
    const r = await fetch(base + '/centers/admin/' + cid, { headers });
    return (await r.json()).data.data.center.status;
  })();
  console.log('center status after approve:', getC, '(expect ACTIVE)');

  // Student with bad email (schema has no email -> should be stripped, 201)
  const sBad = await post('/auth/register/student', {
    centerId: (await (async () => { const r = await fetch(base + '/centers/admin/all', { headers: { Cookie: sa.map(c => c.split(';')[0]).join('; ') } }); return (await r.json()).data.data.items.find(c => c.status === 'ACTIVE').id; })()),
    fullName: 'X', username: 'x_' + rnd(), password: 'Test1234', confirmPassword: 'Test1234',
    phone: '01012345678', subjects: ['x'], email: 'not-an-email',
  });
  console.log('student + bad email:', sBad.status, JSON.stringify(sBad.data.message));
})();
