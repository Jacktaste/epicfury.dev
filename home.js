/* epicfury.dev home. The download asks only for an email: the login server
   hands a 15-minute link to an address that is on an account, and says so
   when it isn't, so the waiting list can take over with the email already in. */
(function () {
'use strict';
const API = 'https://epicfury-roster-api.epicfury.workers.dev';
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);

for (const el of document.querySelectorAll('[data-out]')) {
  const t = new Date(), out = new Date(el.dataset.out + 'T00:00:00');
  const days = Math.round((out - new Date(t.getFullYear(), t.getMonth(), t.getDate())) / 864e5);
  el.textContent = days > 1 ? `Out in ${days} days` : days === 1 ? 'Out tomorrow' : days === 0 ? 'Out today' : 'Out now';
}
for (const el of document.querySelectorAll('[data-today]'))
  el.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/* the stage tilts toward the pointer, and drifts a little on its own */
const stage = $('stage'), fl = $('float');
let px = 0, py = 0, hover = false;
const t0 = performance.now();
function frame(now) {
  if (!calm()) {
    const t = (now - t0) / 1000;
    const ax = hover ? px * 10 : Math.sin(t * .5) * 3;
    const ay = hover ? -py * 7 : Math.cos(t * .4) * 2;
    fl.style.transform = `rotateY(${-14 + ax}deg) rotateX(${6 + ay}deg) translateY(${Math.sin(t * .8) * 4}px)`;
  }
  requestAnimationFrame(frame);
}
fl.style.transition = 'none';
requestAnimationFrame(frame);
addEventListener('pointermove', e => {
  const r = stage.getBoundingClientRect();
  px = (e.clientX - (r.left + r.width / 2)) / r.width;
  py = (e.clientY - (r.top + r.height / 2)) / r.height;
  hover = Math.abs(px) < 1.2 && Math.abs(py) < 1.2;
});

/* the window inside is alive: to-dos tick themselves */
const rows = [...document.querySelectorAll('[data-t]')];
let k = 0;
setInterval(() => {
  if (k < rows.length) {
    rows[k].classList.add('d');
    if (!calm()) rows[k].querySelector('.tick').animate([{ scale: .8 }, { scale: 1.25 }, { scale: 1 }],
      { duration: 340, easing: 'cubic-bezier(.34,1.45,.64,1)' });
    k++;
  } else { rows.forEach(r => r.classList.remove('d')); k = 0; }
  $('mfg').setAttribute('stroke-dashoffset', 47.1 * (1 - (k + 1) / (rows.length + 1)));
}, 1800);

/* the accounts sheet opens from the footer, or when linked to */
const acc = $('accounts');
$('accLink').addEventListener('click', e => { e.preventDefault(); acc.showModal(); });
$('accClose').addEventListener('click', () => acc.close());
acc.addEventListener('click', e => { if (e.target === acc) acc.close(); });
if (location.hash === '#accounts') acc.showModal();
if (location.hash === '#wait') addEventListener('DOMContentLoaded', () => showWait('', false));

/* scroll story: each scene's card rises in, holds while its mock plays, then falls away */
const scenes = [...document.querySelectorAll('.scene')], hw = $('heroWords');
const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
function play(sl) { sl.classList.remove('on'); void sl.offsetWidth; sl.classList.add('on'); }
function onScroll() {
  const H = innerHeight;
  if (!calm()) {
    const hp = cl(scrollY / (H * .7));
    hw.style.transform = `translateY(${-hp * 70}px)`; hw.style.opacity = 1 - hp * 1.1;
    stage.style.opacity = 1 - hp * .9; stage.style.transform = `scale(${1 + hp * .12}) translateY(${-hp * 40}px)`;
  }
  for (const sc of scenes) {
    const r = sc.getBoundingClientRect(), sl = sc.querySelector('.sl'), inn = sc.querySelector('.scene-in');
    const e = calm() ? 1 : cl(1 - r.top / H), p = cl(-r.top / (r.height - H)), x = calm() ? 0 : cl((p - .78) / .22);
    sl.style.setProperty('--e', e.toFixed(3)); sl.style.setProperty('--x', x.toFixed(3));
    inn.style.setProperty('--e', (e - x).toFixed(3));
    const live = e > .85 && x < .5;
    if (live && !sl.dataset.live) { sl.dataset.live = '1'; play(sl); }
    else if (!live && sl.dataset.live && (e < .3 || x > .9)) { delete sl.dataset.live; sl.classList.remove('on'); }
  }
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
onScroll();
$('cue').addEventListener('click', () => scenes[0].scrollIntoView({ behavior: calm() ? 'auto' : 'smooth' }));
$('endWait').addEventListener('click', () => {
  scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' });
  setTimeout(() => showWait($('email').value.trim(), false), calm() ? 0 : 500);
});

/* the email key */
const form = $('form'), email = $('email'), go = $('go'), lab = $('goLabel'), say = $('say');
const wait = $('wait'), wform = $('wform'), wemail = $('wemail'), wgo = $('wgo'), wlab = $('wlab');
const invite = $('invite'), specs = $('specs');
const OK = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const DOTS = '<span class="dots"><i></i><i></i><i></i></span>';
const shake = f => f.animate([{ translate: '0' }, { translate: '-6px' }, { translate: '6px' }, { translate: '-3px' }, { translate: '0' }], { duration: 300 });
const pop = el => { if (!calm()) el.animate([{ opacity: 0, scale: .96 }, { opacity: 1, scale: 1 }], { duration: 320, easing: 'cubic-bezier(.34,1.45,.64,1)' }); };
const mb = n => (n >= 1e9 ? (n / 1e9).toFixed(1) + ' GB' : Math.round(n / 1e6) + ' MB');
function warn(text) { say.textContent = '⚠ ' + text; say.hidden = false; }

async function post(path, body) {
  const r = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: r.ok, status: r.status, d: await r.json().catch(() => ({})) };
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  say.hidden = true;
  const v = email.value.trim();
  if (!OK.test(v)) { email.focus(); shake(form); return; }
  go.disabled = true; lab.innerHTML = DOTS;
  try {
    const r = await post('/v2/download/link', { email: v, what: 'app' });
    if (r.ok) { showDone(r.d); return; }
    if (r.d.code === 'no_account') { showWait(v, true); return; }
    warn(r.status === 429 ? 'Too many tries. Wait a few minutes.' : (r.d.error || 'That didn’t work. Try again.'));
  } catch {
    warn('The download server didn’t answer. Try again in a minute.');
  } finally {
    go.disabled = false; lab.textContent = 'Download';
  }
});

/* not invited: the key turns into the waiting list, with their email already in it */
function showWait(v, refused) {
  $('waitHead').textContent = refused ? 'This email isn’t invited yet' : 'Join the waiting list';
  wemail.value = v || '';
  say.hidden = true; form.hidden = true; $('cform').hidden = true; $('toCode').textContent = 'Setup code'; invite.hidden = true; specs.hidden = true; wait.hidden = false; pop(wait);
  (v ? wgo : wemail).focus();
}
$('toWait').addEventListener('click', () => showWait(email.value.trim(), false));
$('back').addEventListener('click', () => {
  wait.hidden = true; form.hidden = false; invite.hidden = false; specs.hidden = false; email.focus();
});
wform.addEventListener('submit', async e => {
  e.preventDefault();
  const v = wemail.value.trim();
  if (!OK.test(v)) { wemail.focus(); shake(wform); return; }
  wgo.disabled = true; wlab.innerHTML = DOTS;
  const news = $('news').checked;
  try {
    const r = await post('/v2/waitlist', { email: v, news });
    if (!r.ok) throw new Error(r.d.error || '');
    const done = document.createElement('div');
    done.className = 'wait';
    done.innerHTML = '<div class="onlist"><span class="ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><div><b>You’re on the list</b><span></span></div></div>';
    done.querySelector('.onlist span').textContent = 'We’ll email ' + v + ' when there’s room.';
    wait.replaceWith(done); pop(done);
  } catch (err) {
    wgo.disabled = false; wlab.textContent = 'Join';
    shake(wform);
  }
});

/* invited with a setup code (before members could add an email): name and code, same download */
const cform = $('cform'), cgo = $('cgo'), clab = $('clab');
$('toCode').addEventListener('click', () => {
  const on = cform.hidden;
  cform.hidden = !on; form.hidden = on; say.hidden = true;
  $('toCode').textContent = on ? 'Email' : 'Setup code';
  if (on) { pop(cform); $('who').focus(); } else email.focus();
});
cform.addEventListener('submit', async e => {
  e.preventDefault();
  say.hidden = true;
  const who = $('who').value.trim(), code = $('code').value.trim();
  if (!who || !code) { (who ? $('code') : $('who')).focus(); shake(cform); return; }
  cgo.disabled = true; clab.innerHTML = DOTS;
  try {
    const r = await post('/v2/download/link', { who, code, what: 'app' });
    if (r.ok) { showDone(r.d, cform); return; }
    warn(r.status === 429 ? 'Too many tries. Wait a few minutes.' : (r.d.error || 'That didn’t work. Try again.'));
  } catch {
    warn('The download server didn’t answer. Try again in a minute.');
  } finally {
    cgo.disabled = false; clab.textContent = 'Download';
  }
});

/* invited: the key turns into the download card and the browser takes the file */
function showDone(d, from = form) {
  const card = document.createElement('div');
  card.className = 'done';
  card.innerHTML = `<div class="done-top"><img src="/icon-128.png" alt=""><div><b>Epic Fury Studio</b><small></small></div><span class="sp"></span><svg class="ring" viewBox="0 0 34 34"><circle class="bg" cx="17" cy="17" r="14"/><circle class="fg" cx="17" cy="17" r="14" stroke-dasharray="88" stroke-dashoffset="0"/><path class="ok" d="M11 17.5l4 4 8-9"/></svg></div>
  <div class="flow"><div class="step"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>Download</div><span class="arrow">›</span><div class="step"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 4v16"/><path d="m12 12 3-3m-3 3 3 3"/></svg>Applications</div><span class="arrow">›</span><div class="step"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>Open</div></div>`;
  card.querySelector('small').textContent = mb(d.bytes) + ' · downloading';
  from.replaceWith(card); (from === form ? cform : form).hidden = true; specs.hidden = true; invite.hidden = true; say.hidden = true;
  pop(card);
  setTimeout(() => card.querySelector('.ring').classList.add('fin'), calm() ? 0 : 450);
  location.href = d.url;
}
})();
