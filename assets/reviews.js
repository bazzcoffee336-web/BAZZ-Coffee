// Shows approved, verified-buyer reviews for this book page. Loads after the page, so it never slows first paint.
(function () {
  var box = document.getElementById('reviews'); if (!box) return;
  var book = box.getAttribute('data-book'), list = box.querySelector('.rv-list'), sum = box.querySelector('.rv-sum');
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function stars(n) { var s = ''; for (var i = 1; i <= 5; i++) s += '<span class="' + (i <= n ? 'on' : '') + '">★</span>'; return s; }
  function go() {
    fetch('/api/reviews?book=' + encodeURIComponent(book)).then(function (r) { return r.json(); }).then(function (d) {
      var r = (d && d.reviews) || [];
      if (!r.length) return;
      var avg = r.reduce(function (a, x) { return a + x.stars; }, 0) / r.length;
      sum.innerHTML = '<b class="rv-avg">' + avg.toFixed(1) + '</b><span class="rv-stars">' + stars(Math.round(avg)) + '</span><span class="rv-n">' + r.length + ' verified review' + (r.length > 1 ? 's' : '') + '</span>';
      list.innerHTML = r.map(function (x) {
        return '<figure class="rv-card"><div class="rv-stars">' + stars(x.stars) + '</div><blockquote>' + esc(x.text) + '</blockquote><figcaption><b>' + esc(x.name) + '</b>' + (x.country ? ' · ' + esc(x.country) : '') + '<span class="rv-badge">✓ Verified buyer</span></figcaption></figure>';
      }).join('');
      box.classList.add('has');
    }).catch(function () {});
  }
  if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { io.disconnect(); go(); } }, { rootMargin: '400px' }); io.observe(box); } else go();
})();
