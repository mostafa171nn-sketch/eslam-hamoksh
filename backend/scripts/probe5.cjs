const BASE = 'http://localhost:4000/api';

async function j(url, opts = {}) {
  const res = await fetch(url, opts);
  const ct = res.headers.get('content-type') || '';
  const body = ct.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, body };
}

const unwrap = (b) => (Array.isArray(b) ? b : (b && b.data !== undefined ? b.data : b));

(async () => {
  const centers = await j(`${BASE}/centers/search?limit=1`);
  console.log('centers.search raw keys:', JSON.stringify(Object.keys(centers.body)));
  const centerList = centers.body?.data?.items || centers.body?.centers || centers.body?.data?.centers || [];
  const centerId = centerList[0]?.id;
  console.log('centerId:', centerId);

  const subjects = await j(`${BASE}/catalog/subjects`);
  const grades = await j(`${BASE}/catalog/grades`);
  const subjArr = unwrap(subjects.body);
  const gradeArr = unwrap(grades.body);
  console.log('subjects len:', Array.isArray(subjArr) ? subjArr.length : 'NOT ARRAY', '| grades len:', Array.isArray(gradeArr) ? gradeArr.length : 'NOT ARRAY');
  const subjIds = (Array.isArray(subjArr) ? subjArr : []).slice(0, 2).map((s) => s.id);
  const gradeIds = (Array.isArray(gradeArr) ? gradeArr : []).slice(0, 2).map((g) => g.id);
  console.log('subjIds:', subjIds, 'gradeIds:', gradeIds);

  if (!centerId || subjIds.length === 0) {
    console.log('Cannot proceed: missing centerId or subjects');
    return;
  }

  const suffix = Date.now().toString().slice(-6);
  const tests = [
    { role: 'teacher', payload: { centerId, username: `tch${suffix}`, fullName: 'Test Teacher', password: 'Teacher@123', confirmPassword: 'Teacher@123', phone: '+201000000001', subjects: subjIds, grades: gradeIds, yearsExperience: 5, hourlyRate: 200 } },
    { role: 'student', payload: { centerId, username: `stu${suffix}`, fullName: 'Test Student', password: 'Student@123', confirmPassword: 'Student@123', phone: '+201000000002', subjects: subjIds } },
    { role: 'parent', payload: { centerId, username: `par${suffix}`, fullName: 'Test Parent', password: 'Parent@123', confirmPassword: 'Parent@123', phone: '+201000000003' } },
  ];

  for (const t of tests) {
    const reg = await j(`${BASE}/auth/register/${t.role}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(t.payload) });
    console.log(`\n[${t.role}] register status:`, reg.status, '|', reg.body?.message || JSON.stringify(reg.body).slice(0, 200));
    if (reg.status !== 201) continue;
    const login = await j(`${BASE}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: t.payload.username, password: t.payload.password }) });
    console.log(`[${t.role}] login status:`, login.status, '| role:', login.body?.user?.role, '| email:', login.body?.user?.email);
  }

  const bad = await j(`${BASE}/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'teacher' }) });
  console.log('\n[old-endpoint /auth/register] status (expect 404):', bad.status);
})();
