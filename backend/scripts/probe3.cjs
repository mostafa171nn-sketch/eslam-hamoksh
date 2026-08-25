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
const rnd = () => Math.random().toString(36).slice(2, 8);

(async () => {
  const sa = []; await post('/auth/login', { email: 'mostafa171@gmail.com', password: '7Amoksha@22' }, sa);
  const subs = await get('/admin/subjects', sa);
  const grades = await get('/admin/grades', sa);
  const centers = await get('/centers/admin/all', sa);
  const active = centers.data.data.items.find(c => c.status === 'ACTIVE') || centers.data.data.items[0];
  const centerId = active.id;
  const subjectIds = (subs.data.data || []).slice(0, 2).map(s => s.id);
  const gradeIds = (grades.data.data || []).slice(0, 2).map(g => g.id);
  console.log(`center=${centerId} (${active.name}/${active.status}) subjects=${subjectIds.length} grades=${gradeIds.length}`);

  const pw = 'Test1234';
  const tU = 'tch_' + rnd(), sU = 'stu_' + rnd(), pU = 'par_' + rnd();

  console.log('\n--- TEACHER registration ---');
  const tReg = await post('/auth/register/teacher', {
    centerId, fullName: 'Test Teacher', username: tU, password: pw, confirmPassword: pw,
    phone: '01012345678', subjects: subjectIds, grades: gradeIds, yearsExperience: 3, hourlyRate: 100,
  });
  console.log('teacher register:', tReg.status, tReg.data.data?.message || tReg.data.message);
  console.log('teacher login   :', (await post('/auth/login', { username: tU, password: pw })).status);

  console.log('\n--- STUDENT registration ---');
  const sReg = await post('/auth/register/student', {
    centerId, fullName: 'Test Student', username: sU, password: pw, confirmPassword: pw,
    phone: '01012345679', gradeId: gradeIds[0], subjects: subjectIds,
  });
  console.log('student register:', sReg.status, sReg.data.data?.message || sReg.data.message);
  console.log('student login   :', (await post('/auth/login', { username: sU, password: pw })).status);

  console.log('\n--- PARENT registration ---');
  const pReg = await post('/auth/register/parent', {
    centerId, fullName: 'Test Parent', username: pU, password: pw, confirmPassword: pw, phone: '01012345670',
  });
  console.log('parent register :', pReg.status, pReg.data.data?.message || pReg.data.message);
  console.log('parent login    :', (await post('/auth/login', { username: pU, password: pw })).status);

  console.log('\n--- CENTER registration ---');
  const cReg = await post('/centers/register', {
    name: 'Test Center ' + rnd(), adminFullName: 'Test Owner', adminUsername: 'own_' + rnd(),
    adminPhone: '01012345671', adminPassword: pw, email: '', adminEmail: '',
  });
  console.log('center register :', cReg.status, cReg.data.data?.message || cReg.data.message, '| status=', cReg.data.data?.status);
  if (cReg.status === 201) {
    const cid = cReg.data.data.centerId;
    console.log('center approve  :', (await post('/centers/admin/' + cid + '/approve', {}, sa)).status, '(SA only)');
  }

  console.log('\n--- VALIDATION failures (expect 422) ---');
  console.log('teacher missing centerId:', (await post('/auth/register/teacher', {
    fullName: 'X', username: 'x_' + rnd(), password: pw, confirmPassword: pw, phone: '01012345678',
    subjects: subjectIds, grades: gradeIds, yearsExperience: 1, hourlyRate: 1,
  })).status);
  console.log('teacher pw mismatch  :', (await post('/auth/register/teacher', {
    centerId, fullName: 'X', username: 'x_' + rnd(), password: pw, confirmPassword: 'other123', phone: '01012345678',
    subjects: subjectIds, grades: gradeIds, yearsExperience: 1, hourlyRate: 1,
  })).status);
  console.log('student bad email?   :', (await post('/auth/register/student', {
    centerId, fullName: 'X', username: 'x_' + rnd(), password: pw, confirmPassword: pw, phone: '01012345678',
    subjects: subjectIds, email: 'not-an-email',
  })).status, '(teacher schema has no email -> likely stripped)');
  console.log('teacher weak pw      :', (await post('/auth/register/teacher', {
    centerId, fullName: 'X', username: 'x_' + rnd(), password: 'short', confirmPassword: 'short', phone: '01012345678',
    subjects: subjectIds, grades: gradeIds, yearsExperience: 1, hourlyRate: 1,
  })).status);
})();
