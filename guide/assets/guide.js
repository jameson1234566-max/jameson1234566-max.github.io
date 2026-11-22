/* 개발자 체험 공략집 — sidebar, search, theme, spoilers, lightbox. No dependencies. */
(function () {
  'use strict';
  var root = document.documentElement;
  var body = document.body;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  /* UI words by page language (guide/, guide/en/, guide/ja/) */
  var WORDS = {
    ko: { light: '라이트 모드로 바꾸기', dark: '다크 모드로 바꾸기', fold: '모두 접기', unfold: '모두 펼치기', none: ' 검색 결과가 없어요 😢', spoil: '🙈 스포일러 접기 안에 있어요' },
    en: { light: 'Switch to light mode', dark: 'Switch to dark mode', fold: 'Collapse all', unfold: 'Expand all', none: ': no results 😢', spoil: '🙈 Inside a spoiler fold' },
    ja: { light: 'ライトモードにする', dark: 'ダークモードにする', fold: 'すべて閉じる', unfold: 'すべて開く', none: ' の検索結果はありません 😢', spoil: '🙈 ネタバレの折りたたみの中にあります' }
  };
  var L = WORDS[root.lang] || WORDS.ko;

  /* ---------- theme ---------- */
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function stored() { try { return localStorage.getItem('guide-theme'); } catch (e) { return null; } }
  function isDark() { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : !!(mq && mq.matches); }
  function syncDark() {
    root.setAttribute('data-dark', isDark() ? '1' : '0');
    var b = $('.theme-btn'); if (b) b.setAttribute('aria-label', isDark() ? L.light : L.dark);
  }
  syncDark();
  if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (!stored()) syncDark(); });
  var tb = $('.theme-btn');
  if (tb) tb.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('guide-theme', next); } catch (e) { /* storage blocked: theme lasts this page only */ }
    syncDark();
  });

  /* ---------- language menu: close on outside click ---------- */

  /* ---------- sidebar (mobile drawer) ---------- */
  function setNav(open) {
    body.classList.toggle('nav-open', open);
    var b = $('.menu-btn'); if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  var mb = $('.menu-btn');
  if (mb) mb.addEventListener('click', function () { setNav(!body.classList.contains('nav-open')); });
  var scrim = $('.scrim');
  if (scrim) scrim.addEventListener('click', function () { setNav(false); });
  $$('.side a').forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });
  // Tree: a link inside a summary goes to its page and leaves the branch open (the caret alone folds it).
  $$('.tree summary a').forEach(function (a) {
    a.addEventListener('click', function () {
      var d = a.closest('details');
      setTimeout(function () { if (d) d.open = true; }, 0);
    });
  });
  var ta = $('.tree-all');
  if (ta) ta.addEventListener('click', function () {
    var open = ta.getAttribute('data-open') === '1';
    $$('.tree details').forEach(function (d) { d.open = open; });
    ta.setAttribute('data-open', open ? '0' : '1');
    ta.textContent = open ? L.fold : L.unfold;
  });
  var cur = $('.nav a.cur');
  if (cur && cur.scrollIntoView) { var side = $('.side'); if (side) side.scrollTop = Math.max(0, cur.offsetTop - 80); }

  /* ---------- open spoilers that hold the target ---------- */
  function revealHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    var d = el.closest ? el.closest('details') : null;
    while (d) { d.open = true; d = d.parentElement ? d.parentElement.closest('details') : null; }
    if (el.tagName === 'DETAILS') el.open = true;
  }
  window.addEventListener('hashchange', revealHash);
  revealHash();
  if (location.hash) { var t0 = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (t0) setTimeout(function () { t0.scrollIntoView(); }, 0); }

  /* ---------- scroll spy for the page TOC ---------- */
  var tocLinks = $$('.toc a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[decodeURIComponent(a.hash.slice(1))] = a; });
    var heads = $$('.article h2[id], .article h3[id]');
    var visible = {};
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      var first = null;
      for (var i = 0; i < heads.length; i++) { if (visible[heads[i].id]) { first = heads[i].id; break; } }
      if (!first) return;
      tocLinks.forEach(function (a) { a.classList.remove('on'); });
      if (map[first]) map[first].classList.add('on');
    }, { rootMargin: '-70px 0px -60% 0px' });
    heads.forEach(function (h) { io.observe(h); });
  }

  /* ---------- back to top ---------- */
  var tt = $('.totop');
  if (tt) {
    var onScroll = function () { tt.classList.toggle('show', window.scrollY > 600); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    tt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  /* ---------- lightbox ---------- */
  var lb = $('.lightbox');
  if (lb) {
    var lbCap = $('p', lb), lbImg = null, lbFrom = null;
    var closeLb = function () {
      if (!lb.classList.contains('open')) return;
      lb.classList.remove('open');
      if (lbImg) { lbImg.parentNode.removeChild(lbImg); lbImg = null; }
      if (lbFrom && lbFrom.focus) lbFrom.focus();
      lbFrom = null;
    };
    $$('figure.shot img').forEach(function (img) {
      img.setAttribute('tabindex', '0');
      var openLb = function () {
        if (!lbImg) { lbImg = document.createElement('img'); lbCap.parentNode.insertBefore(lbImg, lbCap); }
        lbImg.src = img.currentSrc || img.src; lbImg.alt = img.alt;
        var cap = img.closest('figure').querySelector('figcaption');
        lbCap.textContent = cap ? cap.textContent : '';
        lbFrom = img;
        lb.classList.add('open');
        lb.focus();
      };
      img.addEventListener('click', openLb);
      img.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(); } });
    });
    lb.addEventListener('click', closeLb);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' || e.key === 'Esc') closeLb(); });
  }

  /* ---------- search ---------- */
  var input = $('#q'), box = $('.results'), sb = $('.search-btn');
  if (!input || !box) return;
  var index = null, loading = null, sel = -1;
  function load() {
    if (index) return Promise.resolve(index);
    if (loading) return loading;
    loading = fetch('search-index.json').then(function (r) { return r.json(); }).then(function (j) {
      index = j.map(function (e) { e.nAll = norm(e.t + ' ' + e.h + ' ' + e.x + ' ' + (e.s || '')); e.nHead = norm(e.t + ' ' + e.h); e.nX = norm(e.x); return e; });
      return index;
    }).catch(function () { loading = null; return []; });
    return loading;
  }
  function norm(s) { return (s || '').normalize('NFC').toLowerCase().replace(/\s+/g, ''); }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function termRe(terms) {
    var parts = terms.map(function (t) { return Array.from(t).map(function (ch) { return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('\\s*'); });
    return new RegExp('(' + parts.join('|') + ')', 'gi');
  }
  function snippet(text, re) {
    re.lastIndex = 0;
    var m = re.exec(text), start = 0;
    if (m) start = Math.max(0, m.index - 36);
    var s = text.slice(start, start + 120);
    var out = (start > 0 ? '…' : '') + esc(s) + (start + 120 < text.length ? '…' : '');
    return out.replace(new RegExp(re.source, 'gi'), '<mark>$1</mark>');
  }
  function render(q) {
    var terms = q.normalize('NFC').toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) { box.classList.remove('open'); box.innerHTML = ''; return; }
    var nterms = terms.map(norm);
    var hits = [];
    index.forEach(function (e) {
      for (var i = 0; i < nterms.length; i++) if (e.nAll.indexOf(nterms[i]) < 0) return;
      var score = 0;
      nterms.forEach(function (t) { if (e.nHead.indexOf(t) >= 0) score += 10; if (e.nX.indexOf(t) >= 0) score += 2; });
      if (!e.h) score -= 1;
      hits.push({ e: e, score: score });
    });
    hits.sort(function (a, b) { return b.score - a.score; });
    hits = hits.slice(0, 30);
    sel = -1;
    if (!hits.length) { box.innerHTML = '<div class="r-empty"><b>' + esc(q) + '</b>' + L.none + '</div>'; box.classList.add('open'); return; }
    var re = termRe(terms);
    box.innerHTML = hits.map(function (h) {
      var e = h.e, inX = nterms.some(function (t) { return e.nX.indexOf(t) >= 0 || e.nHead.indexOf(t) >= 0; });
      var head = esc(e.h || e.t).replace(new RegExp(re.source, 'gi'), '<mark>$1</mark>');
      var snip = inX ? '<span class="r-snip">' + snippet(e.x, re) + '</span>' : '<span class="r-snip"><span class="r-sp">' + L.spoil + '</span></span>';
      return '<a href="' + e.p + (e.a ? '#' + encodeURIComponent(e.a) : '') + '"><span class="r-path">' + esc(e.t) + '</span><span class="r-head">' + head + '</span>' + snip + '</a>';
    }).join('');
    box.classList.add('open');
  }
  function move(d) {
    var items = $$('a', box); if (!items.length) return;
    sel = (sel + d + items.length) % items.length;
    items.forEach(function (a, i) { a.classList.toggle('sel', i === sel); });
    items[sel].scrollIntoView({ block: 'nearest' });
  }
  var timer;
  input.addEventListener('focus', function () { load(); if (input.value) load().then(function () { render(input.value); }); });
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { load().then(function () { render(input.value); }); }, 80); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { var items = $$('a', box); var a = items[sel >= 0 ? sel : 0]; if (a) { e.preventDefault(); location.href = a.href; box.classList.remove('open'); } }
    else if (e.key === 'Escape') { box.classList.remove('open'); input.blur(); body.classList.remove('search-open'); }
  });
  box.addEventListener('click', function (e) { if (e.target.closest('a')) { box.classList.remove('open'); body.classList.remove('search-open'); setTimeout(revealHash, 0); } });
  document.addEventListener('click', function (e) { if (!e.target.closest('.gh-search') && !e.target.closest('.search-btn')) box.classList.remove('open'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== input && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); body.classList.add('search-open'); input.focus(); }
  });
  if (sb) sb.addEventListener('click', function () {
    var open = !body.classList.contains('search-open');
    body.classList.toggle('search-open', open);
    sb.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) input.focus(); else box.classList.remove('open');
  });
})();
