// Prueba funcional de Little Learners con Supabase simulado.
// Uso: node test_ll_functional.js <archivo.html> <old|new> <salida.json> [carpeta_capturas]
const { chromium } = require('playwright');
const fs = require('fs');
const { install } = require('./mock_supabase');
const [file, mode, outJson, shotDir] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const R = {}; const errors = [];
  const vis = (p, sel) => p.isVisible(sel);
  async function shot(p, name) { if (shotDir) await p.screenshot({ path: `${shotDir}/${name}.png`, fullPage: true }); }
  async function nav(p, target) {
    if (mode === 'new') { const id = { setup: '#navEvaluate', reports: '#reportsBtn', classView: '#classBtn', settingsView: '#settingsBtn' }[target]; await p.click(id); }
    else {
      // versión antigua: volver a evaluación con los botones «Volver» y desde ahí abrir la sección
      if (await vis(p, '#reports')) await p.click('#backSetup');
      if (await vis(p, '#classView')) await p.click('#backClassBtn');
      if (await vis(p, '#settingsView')) await p.click('#backSettingsBtn');
      if (await vis(p, '#result')) await p.click('#again');
      if (target !== 'setup') await p.click({ reports: '#reportsBtn', classView: '#classBtn', settingsView: '#settingsBtn' }[target]);
    }
    await sleep(400);
  }
  async function setMonth(p, v) { await p.selectOption('#assessmentMonth', v); await sleep(300); }
  const studentCards = p => p.$$eval('#studentGrid .studentbtn', bs => bs.map(b => ({ name: b.childNodes[0].textContent.trim(), done: b.classList.contains('done'), selected: b.classList.contains('selected') })));

  for (const vp of [{ name: 'desktop', width: 1280, height: 900 }, { name: 'tablet', width: 820, height: 1180 }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.name === 'tablet' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(vp.name + ': ' + e.message));
    p.on('dialog', d => d.accept());
    const { db } = await install(p);
    const k = s => `${vp.name}.${s}`;
    await p.goto('file://' + file);
    await shot(p, vp.name + '-01-login');
    // Login
    await p.fill('#loginEmail', 'maestra@escuela.test'); await p.fill('#loginPassword', 'mala'); await p.click('#loginBtn'); await sleep(400);
    R[k('login.wrongPasswordError')] = (await p.textContent('#loginError')).length > 0 && !(await vis(p, '#appView'));
    await p.fill('#loginPassword', 'clave-prueba'); await p.click('#loginBtn');
    await p.waitForSelector('#studentGrid .studentbtn', { timeout: 8000 }); await sleep(300);
    R[k('login.ok')] = await vis(p, '#setup');
    let cards = await studentCards(p);
    R[k('setup.students')] = cards.length; R[k('setup.done')] = cards.filter(c => c.done).length;
    R[k('setup.monthCount')] = await p.textContent('#monthCount');
    R[k('setup.title')] = await p.textContent('#setupTitle');
    await shot(p, vp.name + '-02-evaluar');
    // Area change updates UI
    await p.selectOption('#area', 'counting'); await sleep(200);
    R[k('area.counting.speedVisible')] = await vis(p, '#speedField'); R[k('area.counting.caseHidden')] = !(await vis(p, '#caseField'));
    R[k('area.counting.title')] = await p.textContent('#setupTitle');
    await p.selectOption('#area', 'letters'); await sleep(200);
    // Month change
    await setMonth(p, '2026-09');
    R[k('month.sep.done')] = (await studentCards(p)).filter(c => c.done).length;
    R[k('month.sep.title')] = await p.textContent('#monthTitle');
    await setMonth(p, '2026-10');
    // Month warning modal (Nov ≠ current month)
    await setMonth(p, '2026-11'); await p.click('#start'); await sleep(300);
    R[k('monthWarning.shown')] = await vis(p, '#monthWarningModal');
    await shot(p, vp.name + '-03-aviso-mes');
    await p.click('#reviewMonthBtn'); await sleep(200);
    R[k('monthWarning.closed')] = !(await vis(p, '#monthWarningModal')) && await vis(p, '#setup');
    await setMonth(p, '2026-10');
    // Run full letters evaluation for Zone Guest
    await p.click('#studentGrid .studentbtn:has-text("Zone Guest")'); await sleep(150);
    R[k('select.selected')] = (await studentCards(p)).find(c => c.name === 'Zone Guest').selected;
    await p.click('#start'); await sleep(500);
    R[k('test.visible')] = await vis(p, '#test');
    R[k('test.who')] = await p.textContent('#who');
    if (mode === 'new') R[k('test.shellHidden')] = !(await vis(p, '#appShellBar'));
    await shot(p, vp.name + '-04-evaluacion');
    // pause / resume
    await p.keyboard.press('Escape'); await sleep(200);
    R[k('test.pauseShown')] = await vis(p, '#pausebox');
    await shot(p, vp.name + '-05-pausa');
    await p.click('#resume'); await sleep(300);
    let n = 0; const seen = new Set();
    while (!(await vis(p, '#result')) && n < 400) {
      const letter = await p.textContent('#letter'); seen.add(letter);
      // alterna correctas (espacio) y dejar que el tiempo marque incorrecta cada 5ª letra
      if (seen.size % 5 === 0) await sleep(4300); else { await p.keyboard.press('Space'); await sleep(260); }
      n++;
    }
    R[k('test.finished')] = await vis(p, '#result');
    await sleep(800);
    R[k('result.score')] = (await p.textContent('#score')).trim();
    R[k('result.who')] = (await p.textContent('#resultWho')).trim();
    R[k('db.savedZoneGuest')] = db.assessments.filter(a => a.student_id === 14 && a.assessment_month === '2026-10-01').length === 1 && db.letter_results.filter(x => x.assessment_id === db.assessments.find(a => a.student_id === 14)?.id).length === 27;
    await shot(p, vp.name + '-06-resultado');
    await p.click('#again'); await sleep(500);
    cards = await studentCards(p);
    R[k('afterEval.zoneGuestDone')] = cards.find(c => c.name === 'Zone Guest').done;
    // Context menu: view results
    await p.click('#studentGrid .studentbtn:has-text("Abigail")', { button: 'right' }); await sleep(250);
    R[k('ctx.menuShown')] = await vis(p, '#studentEvalMenu');
    await shot(p, vp.name + '-07-menu-estudiante');
    await p.click('#studentEvalViewBtn'); await sleep(600);
    R[k('ctx.resultsOverlay')] = await vis(p, '#studentResultsOverlay');
    R[k('ctx.resultsText')] = ((await p.textContent('#studentResultsContent')) || '').slice(0, 60);
    await shot(p, vp.name + '-08-resultados-estudiante');
    await p.click('#studentResultsCloseBtn'); await sleep(200);
    R[k('ctx.overlayClosed')] = !(await vis(p, '#studentResultsOverlay'));
    // Context menu: delete evaluation of Abraham
    await p.click('#studentGrid .studentbtn:has-text("Abraham")', { button: 'right' }); await sleep(250);
    await p.click('#studentEvalDeleteBtn'); await sleep(900);
    R[k('ctx.deleteWorked')] = !(await studentCards(p)).find(c => c.name === 'Abraham').done && !db.assessments.some(a => a.student_id === 2 && a.assessment_month === '2026-10-01' && a.assessment_area === 'letters');
    // Reports
    await nav(p, 'reports'); await sleep(500);
    R[k('reports.visible')] = await vis(p, '#reports');
    R[k('reports.monthTitle')] = await p.textContent('#reportMonthTitle');
    R[k('reports.rows')] = await p.$$eval('#reportList .reportrow', r => r.length);
    R[k('reports.classNeeds')] = await p.$$eval('#classNeeds .needrow', r => r.length);
    await shot(p, vp.name + '-09-reportes');
    await p.selectOption('#reportStudent', { label: 'Abigail' }); await sleep(300);
    await p.click('#reportList .reportrow >> nth=0'); await sleep(300);
    R[k('reports.detailShown')] = await vis(p, '#studentDetail');
    R[k('reports.detailPercent')] = await p.textContent('#detailPercent');
    R[k('reports.monthlyBars')] = await p.$$eval('#monthlyBars .monthbar', r => r.length);
    await shot(p, vp.name + '-10-detalle');
    await p.selectOption('#reportMode', 'general'); await sleep(300);
    R[k('reports.general.shown')] = await vis(p, '#generalStudentReport');
    await shot(p, vp.name + '-11-reporte-general');
    await p.selectOption('#reportMode', 'progress'); await sleep(300);
    R[k('reports.progress.shown')] = await vis(p, '#monthlyProgressReport');
    R[k('reports.progress.len')] = ((await p.textContent('#monthlyProgressReport')) || '').length > 20;
    await shot(p, vp.name + '-12-progreso');
    await p.selectOption('#reportMode', 'area'); await sleep(200);
    await p.selectOption('#reportStudent', 'all'); await sleep(200);
    await p.selectOption('#reportSort', 'alpha'); await sleep(200);
    R[k('reports.sortAlphaFirst')] = (await p.textContent('#reportList .reportrow .reportname >> nth=0')).trim();
    // month change while in reports
    if (mode === 'new') { await setMonth(p, '2026-09'); R[k('reports.monthFromReports')] = (await p.textContent('#reportMonthTitle')).trim(); R[k('reports.rowsSep')] = await p.$$eval('#reportList .reportrow', r => r.length); await setMonth(p, '2026-10'); }
    R[k('reports.printBtn')] = await vis(p, '#printReportBtn');
    // Class view
    await nav(p, 'classView'); await sleep(600);
    R[k('class.visible')] = await vis(p, '#classView');
    R[k('class.items')] = await p.$$eval('#classRoster .class-item', r => r.length);
    await p.fill('#newStudentName', 'Prueba Nueva'); await p.click('#addStudentBtn'); await sleep(600);
    R[k('class.added')] = (await p.textContent('#classRoster')).includes('Prueba Nueva') && db.students.some(s => s.name === 'Prueba Nueva');
    await shot(p, vp.name + '-13-mi-clase');
    // retire a student
    const row = p.locator('#classRoster .class-item', { hasText: 'Natalie' });
    await row.locator('button', { hasText: 'Retirar' }).click(); await sleep(600);
    R[k('class.retired')] = db.students.find(s => s.name === 'Natalie').active === false;
    await nav(p, 'setup'); await sleep(800);
    cards = await studentCards(p);
    R[k('class.backToSetup.studentsIncludesNew')] = cards.some(c => c.name === 'Prueba Nueva');
    R[k('class.backToSetup.retiredHidden')] = !cards.some(c => c.name === 'Natalie');
    // Settings
    await nav(p, 'settingsView');
    R[k('settings.visible')] = await vis(p, '#settingsView');
    await p.click('#settingsView summary'); await sleep(200);
    await p.click('#resetAllDataBtn'); await sleep(200);
    R[k('settings.resetModal')] = await vis(p, '#resetDataModal');
    await p.fill('#resetConfirmText', 'ELIMINAR TODO'); await sleep(100);
    R[k('settings.confirmEnabled')] = !(await p.isDisabled('#confirmResetDataBtn'));
    await shot(p, vp.name + '-14-reiniciar');
    await p.click('#cancelResetDataBtn'); await sleep(200);
    R[k('settings.modalClosed')] = !(await vis(p, '#resetDataModal'));
    R[k('settings.dataIntact')] = db.students.length === 15;
    await shot(p, vp.name + '-15-configuracion');
    await nav(p, 'setup');
    R[k('end.onSetup')] = await vis(p, '#setup');
    // only-one-section-visible invariant
    R[k('end.singleSection')] = (await p.$$eval('#setup,#reports,#classView,#settingsView,#test,#result', s => s.filter(x => getComputedStyle(x).display !== 'none').length)) === 1;
    await ctx.close();
  }
  R.errors = errors;
  fs.writeFileSync(outJson, JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R, null, 1));
  await browser.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
