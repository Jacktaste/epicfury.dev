/* The connected-account pages on epicfury.dev — one script, all platforms.
 *
 * WHY THESE PAGES EXIST
 * TikTok refuses a loopback redirect ("localhost is not supported"), so consent
 * cannot come back to the engine on the operator's own Mac the way Google's
 * does. It has to land on a public https page instead, and the last step is
 * carried by a human: copy the address, paste it into Clip Studio. Meta is the
 * same wall without Google's loopback exception.
 *
 * So the entire job here is: take what the platform put on the query string and
 * make handing it over ONE tap. Everything an operator got before this — a bare
 * error page whose URL happened to contain the code, or "select the address bar,
 * careful not to lose the end of it" — was the worst part of onboarding anyone
 * who does not already know what an OAuth code is.
 *
 * WHAT IT MUST NEVER DO
 * The code on the query string is a bearer credential for about sixty seconds.
 * This page sends it NOWHERE: no fetch, no analytics, no beacon, no logging, no
 * third-party script of any kind. It reads the URL, draws it, and copies it to
 * the clipboard on request. Adding any network call to this file hands somebody
 * else's account away, so there are none — and there is no build step that could
 * quietly add one either.
 *
 * NO DEEP LINK, ON PURPOSE
 * The obvious nicety is an "Open in Clip Studio" button that hands the code
 * straight to the app. That needs a registered URL scheme, and Clip Studio has
 * none: its bundle (com.gawne.clipstudio) declares no CFBundleURLTypes, so
 * clipstudio://… resolves to nothing on every Mac it is installed on. Inventing
 * one here would produce a button that silently does nothing, which is worse
 * than a copy control that works. If a scheme is ever registered in the app
 * bundle, this is the file that grows the button. */

(function () {
  'use strict';

  var body = document.body;
  var platform = body.getAttribute('data-platform') || 'That account';
  var where = body.getAttribute('data-where') || 'Settings › Connections';
  var out = document.getElementById('out');
  if (!out) return;

  var q;
  try {
    q = new URLSearchParams(window.location.search);
  } catch (e) {
    q = null;
  }
  function get(name) { return (q && q.get(name)) || ''; }

  /* Every platform here spells its refusal differently, and the useful sentence
   * is never in the same field twice: TikTok sends error_description, Meta sends
   * error_message inside error_description sometimes and error_reason others,
   * Google sends a bare error slug. Take the longest one that exists rather than
   * guessing which platform this page is, so a new field never reads as blank. */
  var reason = [get('error_description'), get('error_message'),
    get('error_reason'), get('error')]
    .filter(Boolean)
    .sort(function (a, b) { return b.length - a.length; })[0] || '';

  var code = get('code');

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) { for (var k in attrs) { n.setAttribute(k, attrs[k]); } }
    if (text != null) { n.textContent = text; }
    return n;
  }

  document.title = platform + ' — Epic Fury Studio';

  if (!code) {
    /* No code means the platform refused, or somebody opened this page on its
     * own. Say which, in the platform's own words, and do not offer a control
     * that would copy a useless address. */
    document.getElementById('head').textContent =
      reason ? platform + ' did not connect' : 'Nothing to copy';
    out.appendChild(el('div', { 'class': 'bad' },
      reason || 'Start again from Connect in Epic Fury Studio.'));
    return;
  }

  document.getElementById('head').textContent = platform + ' approved';

  /* The WHOLE address, because that is what the paste boxes in Clip Studio
   * take — they parse code and state out of it themselves, and the state check
   * is what refuses a link that did not come from this studio's own consent.
   * Copying only the code would quietly disarm that check. */
  var full = window.location.href;

  var btn = el('button', { 'class': 'copy', type: 'button' });
  var label = el('span', { 'class': 'label' }, 'Copy for Epic Fury Studio');
  btn.appendChild(label);
  btn.appendChild(el('span', { 'class': 'code' }, full));
  out.appendChild(btn);

  var hint = el('p', { 'class': 'where' }, 'Paste it into ' + where + '.');
  out.appendChild(hint);

  function flash(msg, ok) {
    label.textContent = msg;
    btn.setAttribute('data-done', ok ? '1' : '0');
    window.setTimeout(function () {
      label.textContent = 'Copy for Epic Fury Studio';
      btn.removeAttribute('data-done');
    }, 2600);
  }

  /* Two routes on purpose. The async Clipboard API is the good one but it is
   * refused outright in a few real situations — an iframe, a browser with
   * clipboard-write denied, anything not treated as a secure context. The
   * selection fallback works in all of them, and a copy step that fails is a
   * dead end for the whole connection. */
  function legacyCopy(text) {
    var ta = el('textarea');
    ta.value = text;
    ta.setAttribute('readonly', 'readonly');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function fallback() {
    /* One attempt, one answer. Calling legacyCopy twice to decide the label and
     * the flag separately would put two copies on the clipboard stack and, on a
     * browser that refuses the second, report a failure that had worked. */
    var ok = legacyCopy(full);
    flash(ok ? 'Copied' : 'Select it and copy by hand', ok);
  }

  btn.addEventListener('click', function () {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(full).then(function () {
        flash('Copied', true);
      }, fallback);
      return;
    }
    fallback();
  });
})();
