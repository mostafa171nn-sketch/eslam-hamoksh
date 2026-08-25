const BASE = 'http://localhost:4000/api';

async function j(url, opts = {}) {
  const res = await fetch(url, opts);
  const ct = res.headers.get('content-type') || '';
  const body = ct.includes('application/json') ? await res.json() : await res.text();
  let cookie = '';
  const sc = res.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  return { status: res.status, body, cookie };
}

function nextDateForWeekday(targetDay) {
  const now = new Date();
  const out = new Date(now);
  out.setDate(now.getDate() + 1); // at least tomorrow
  let guard = 0;
  while (out.getDay() !== targetDay && guard < 14) {
    out.setDate(out.getDate() + 1);
    guard++;
  }
  const y = out.getFullYear();
  const m = String(out.getMonth() + 1).padStart(2, '0');
  const d = String(out.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

(async () => {
  // login as seed student
  const login = await j(`${BASE}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'ahmed.student', password: 'Student@123' }) });
  console.log('student login:', login.status);
  const cookie = login.cookie;
  console.log('cookie len:', cookie?.length, '| starts:', cookie?.slice(0, 20));
  const meTest = await j(`${BASE}/students/me`, { headers: { Cookie: cookie } });
  console.log('students/me via cookie:', meTest.status);
  const auth = { 'content-type': 'application/json', Cookie: cookie };

  // get teachers and find one with availability
  const list = await j(`${BASE}/teachers?limit=20`);
  const teachers = Array.isArray(list.body?.data) ? list.body.data : (list.body?.data?.teachers || list.body?.teachers || []);
  let tid = null, subjects = [], avail = [];
  for (const t of teachers) {
    const prof = await j(`${BASE}/teachers/${t.id}`);
    const p = prof.body?.data || prof.body;
    const a = (p?.availability || []).filter((x) => x.startTime && x.endTime);
    if (a.length && (p?.subjects || []).length) {
      tid = t.id; subjects = p.subjects; avail = a; break;
    }
  }
  console.log('teacher id:', tid, '| subjects:', subjects.length, '| availability:', avail.length);
  console.log('subjects:', subjects.length, '| availability slots:', avail.length);
  if (!avail.length || !subjects.length) {
    console.log('No availability/subjects on teacher; cannot test booking.');
    console.log('profile keys:', Object.keys(p || {}));
    return;
  }

  const slot = avail[0];
  const subjId = subjects[0]?.subjectId || subjects[0]?.id;
  const date = nextDateForWeekday(slot.day);
  console.log(`Booking teacher ${tid} subject ${subjId} on ${date} ${slot.startTime}-${slot.endTime}`);

  const bookPayload = { teacherId: tid, subjectId: subjId, date, startTime: slot.startTime, endTime: slot.endTime };
  const r1 = await j(`${BASE}/lessons/book`, { method: 'POST', headers: auth, body: JSON.stringify(bookPayload) });
  console.log('[book #1] status:', r1.status, r1.body?.message || JSON.stringify(r1.body).slice(0, 150));

  // duplicate same slot -> should be rejected
  const r2 = await j(`${BASE}/lessons/book`, { method: 'POST', headers: auth, body: JSON.stringify(bookPayload) });
  console.log('[book #2 duplicate] status:', r2.status, r2.body?.message || JSON.stringify(r2.body).slice(0, 150));

  // off-schedule time -> should be rejected
  const off = await j(`${BASE}/lessons/book`, { method: 'POST', headers: auth, body: JSON.stringify({ teacherId: tid, subjectId: subjId, date, startTime: '02:00', endTime: '03:00' }) });
  console.log('[book off-schedule] status:', off.status, off.body?.message || JSON.stringify(off.body).slice(0, 150));

  // non-student role cannot book -> login parent, try book
  const plogin = await j(`${BASE}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'ahmed.parent', password: 'Parent@123' }) });
  const pauth = { headers: { 'content-type': 'application/json', Cookie: plogin.cookie } };
  const r3 = await j(`${BASE}/lessons/book`, { method: 'POST', headers: pauth, body: JSON.stringify(bookPayload) });
  console.log('[book as parent] status:', r3.status, r3.body?.message || JSON.stringify(r3.body).slice(0, 150));
})();
