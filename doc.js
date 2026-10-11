/* Text pages: cards start hidden before the first paint (the head adds .rv) and rise in, once, as they come into view. */
(function () {
  var root = document.documentElement;
  if (!root.classList.contains('rv')) return;
  root.dataset.rvok = '1';
  var cards = [].slice.call(document.querySelectorAll('.doc section, .doc .card'));
  if (!('IntersectionObserver' in window)) { cards.forEach(function (c) { c.classList.add('in'); }); return; }
  var n = 0;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      setTimeout(function () { e.target.classList.add('in'); }, 70 * n++);
    });
    setTimeout(function () { n = 0; }, 120);
  }, { rootMargin: '0px 0px -6% 0px' });
  cards.forEach(function (c) { io.observe(c); });
})();
