// Simulador mínimo de Supabase (auth + PostgREST) para pruebas en Playwright.
// Nunca se conecta a la base real: todas las peticiones a *.supabase.co se responden aquí.
const LETTERS_ES = 'A B C D E F G H I J K L M N Ñ O P Q R S T U V W X Y Z'.split(' ');
const UID = 'teacher-0001';

function seed() {
  const names = ['Abigail', 'Abraham', 'Anthony', 'Arleth', 'Ashley', 'Erik', 'Jayleen', 'Joseline', 'Luis', 'Misraim', 'Natalia', 'Natalie', 'Uziel', 'Zone Guest'];
  const db = { students: [], assessments: [], letter_results: [], seq: { students: 0, assessments: 0, letter_results: 0 } };
  names.forEach((name, i) => db.students.push({ id: ++db.seq.students, name, active: true, created_at: '2026-08-15T12:00:00Z', teacher_id: UID }));
  const addAssessment = (student_id, month, area, letter_case, language, items, correctRatio, extra = {}) => {
    const a = { id: ++db.seq.assessments, student_id, assessment_month: month + '-01', assessment_area: area, letter_case, language, max_count: null, completed_at: `${month}-1${student_id % 9}T15:00:00Z`, ...extra };
    db.assessments.push(a);
    items.forEach((item, k) => db.letter_results.push({ id: ++db.seq.letter_results, assessment_id: a.id, item, correct: ((k * 7 + student_id * 3) % 100) / 100 < correctRatio, response_time_ms: 900 + k * 10, attempt: 1 }));
  };
  // Octubre: 13 de 14 evaluados en letras mayúsculas (como la captura); Septiembre: 10 evaluados.
  for (let id = 1; id <= 13; id++) addAssessment(id, '2026-10', 'letters', 'upper', 'es', LETTERS_ES, 0.55 + (id % 5) * 0.08);
  for (let id = 1; id <= 10; id++) addAssessment(id, '2026-09', 'letters', 'upper', 'es', LETTERS_ES, 0.35 + (id % 4) * 0.08);
  for (let id = 1; id <= 6; id++) addAssessment(id, '2026-10', 'numbers', 'recognition', 'es', Array.from({ length: 31 }, (_, i) => String(i)), 0.6);
  addAssessment(2, '2026-10', 'counting', 'recognition', 'es', [], 0, { max_count: 18 });
  return db;
}

function parseFilters(params) {
  const f = [];
  for (const [k, v] of params) {
    if (['select', 'order', 'apikey', 'limit', 'offset'].includes(k)) continue;
    const m = /^(eq|neq|in|gt|gte|lt|lte)\.(.*)$/.exec(v);
    if (!m) continue;
    f.push({ col: k, op: m[1], val: m[2] });
  }
  return f;
}
function match(row, f) {
  return f.every(({ col, op, val }) => {
    const r = row[col];
    if (op === 'eq') return String(r) === val || (r === true && val === 'true') || (r === false && val === 'false');
    if (op === 'neq') return String(r) !== val;
    if (op === 'in') return val.replace(/^\(|\)$/g, '').split(',').map(s => s.replace(/^"|"$/g, '')).includes(String(r));
    return true;
  });
}
function project(row, select) {
  if (!select || select === '*') return { ...row };
  const o = {}; select.split(',').forEach(c => { if (c in row) o[c] = row[c]; }); return o;
}

function install(page, opts = {}) {
  const db = opts.db || seed();
  const log = [];
  return page.route(/supabase\.co/, async route => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const json = (status, body, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', ...headers }, body: JSON.stringify(body) });
    log.push(method + ' ' + url.pathname + url.search.replace(/apikey=[^&]+/, 'apikey=…'));
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (url.pathname.startsWith('/auth/v1/token')) {
      const body = JSON.parse(req.postData() || '{}');
      if (url.searchParams.get('grant_type') === 'password' && body.password !== 'clave-prueba') return json(400, { error_description: 'Invalid login credentials' });
      return json(200, { access_token: 'h.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64') + '.s', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: body.email || 'maestra@escuela.test' } });
    }
    const m = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname);
    if (!m || !db[m[1]]) return json(404, { message: 'not found' });
    const table = m[1], rows = db[table], f = parseFilters(url.searchParams), select = url.searchParams.get('select');
    const prefer = req.headers()['prefer'] || '';
    if (method === 'GET') {
      let out = rows.filter(r => match(r, f));
      const range = req.headers()['range'];
      if (range) { const [a, b] = range.split('-').map(Number); out = out.slice(a, b + 1); }
      return json(200, out.map(r => project(r, select)));
    }
    if (method === 'POST') {
      let body = JSON.parse(req.postData() || '[]'); if (!Array.isArray(body)) body = [body];
      const inserted = body.map(b => {
        const r = { id: ++db.seq[table], ...b };
        if (table === 'students') { r.active ??= true; r.created_at ??= new Date().toISOString(); r.teacher_id ??= UID; }
        if (table === 'assessments') { r.completed_at ??= new Date().toISOString(); r.max_count ??= null; }
        rows.push(r); return r;
      });
      return json(201, prefer.includes('return=representation') ? inserted.map(r => project(r, select)) : []);
    }
    if (method === 'PATCH') {
      const body = JSON.parse(req.postData() || '{}'); const hit = rows.filter(r => match(r, f)); hit.forEach(r => Object.assign(r, body));
      return json(200, prefer.includes('return=representation') ? hit : []);
    }
    if (method === 'DELETE') {
      const hit = rows.filter(r => match(r, f));
      db[table] = rows.filter(r => !hit.includes(r));
      // cascada como la base real: borrar evaluaciones/resultados dependientes
      if (table === 'students') { const ids = new Set(hit.map(s => s.id)); const asg = db.assessments.filter(a => ids.has(a.student_id)).map(a => a.id); db.assessments = db.assessments.filter(a => !ids.has(a.student_id)); db.letter_results = db.letter_results.filter(x => !asg.includes(x.assessment_id)); }
      if (table === 'assessments') { const ids = new Set(hit.map(a => a.id)); db.letter_results = db.letter_results.filter(x => !ids.has(x.assessment_id)); }
      return json(200, prefer.includes('return=representation') ? hit : []);
    }
    return json(405, {});
  }).then(() => ({ db, log }));
}
module.exports = { install, seed, UID };
