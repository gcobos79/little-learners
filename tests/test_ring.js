const { chromium } = require('playwright');
const { install } = require('./mock_supabase');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await install(p);
  await p.goto('file:///home/claude/ll/LittleLearners_V6_1_0.html');
  await p.fill('#loginEmail', 'm@e.test'); await p.fill('#loginPassword', 'clave-prueba'); await p.click('#loginBtn');
  await p.waitForSelector('#studentGrid .ll-ring'); await sleep(500);
  const rings = () => p.$$eval('#studentGrid .studentbtn', bs => Object.fromEntries(bs.map(b => [b.childNodes[0].textContent.trim(), b.querySelector('.ll-ring')?.dataset.key])));
  const gauge = () => p.textContent('#llGaugeNum');
  // Datos simulados de octubre: Letras mayúsculas (1-13), Números (1-6), Conteo (solo 2) → total 3
  let r = await rings();
  console.log('Oct rings:', JSON.stringify(r), '| gauge', await gauge(), '| avatar', await p.textContent('#startAvatar'));
  console.log('expect Abigail 2/3, Abraham 3/3, Luis 1/3, Zone Guest 0/3 →', r['Abigail'] === '2/3' && r['Abraham'] === '3/3' && r['Luis'] === '1/3' && r['Zone Guest'] === '0/3');
  await p.selectOption('#assessmentMonth', '2026-09'); await sleep(400); r = await rings();
  console.log('Sep: Abigail', r['Abigail'], 'Uziel', r['Uziel'], 'gauge', await gauge(), '→', r['Abigail'] === '1/1' && r['Uziel'] === '0/1');
  await p.selectOption('#assessmentMonth', '2026-12'); await sleep(400); r = await rings();
  console.log('Dec (no data): all 0/0 →', Object.values(r).every(v => v === '0/0'), 'gauge', await gauge());
  await p.selectOption('#assessmentMonth', '2026-10'); await sleep(400);
  // Selección: cambiar a Zone Guest actualiza avatar y tarjeta
  await p.click('#studentGrid .studentbtn:has-text("Zone Guest")'); await sleep(300);
  console.log('select Zone Guest: avatar', await p.textContent('#startAvatar'), 'summary', await p.textContent('#startSummary'), 'selected class', await p.$eval('#studentGrid .studentbtn.selected', b => b.childNodes[0].textContent.trim()));
  await p.screenshot({ path: '/home/claude/ll/shots_v61/ring-desktop.png' });
  // Evaluar Zone Guest en Minúsculas (nueva evaluación del mes) → total pasa a 4
  await p.selectOption('#case', 'lower'); await sleep(300);
  await p.click('#start'); await sleep(500);
  for (let i = 0; i < 200 && !(await p.isVisible('#result')); i++) { await p.keyboard.press('Space'); await sleep(240); }
  await sleep(900); await p.click('#again'); await sleep(900);
  r = await rings();
  console.log('after lowercase eval: Zone Guest', r['Zone Guest'], 'Abigail', r['Abigail'], '→', r['Zone Guest'] === '1/4' && r['Abigail'] === '2/4');
  await p.selectOption('#case', 'upper'); await sleep(300);
  await p.setViewportSize({ width: 820, height: 1180 }); await sleep(400);
  await p.screenshot({ path: '/home/claude/ll/shots_v61/ring-tablet.png', fullPage: true });
  console.log('errors', errs); await b.close();
})();
