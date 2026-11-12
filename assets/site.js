(() => {
  const nav = document.getElementById('nav');
  let solid = null;
  const check = () => { const s = scrollY > 40; if (s !== solid) { solid = s; nav.classList.toggle('solid', s); } };
  addEventListener('scroll', check, { passive: true }); check();

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 80 + 'ms';
    io.observe(el);
  });

  const form = document.getElementById('form');
  if (form) {
    const email = document.getElementById('email');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = email.value.trim().toLowerCase();
      const hp = document.getElementById('hp');
      if (hp && hp.value) return;                                   // bots fill the hidden field
      if (!v || v.length > 254 || !/^[^\s@<>()"']+@[^\s@<>()"']+\.[a-z]{2,}$/.test(v) || !email.checkValidity()) { email.focus(); return; }
      let last = 0; try { last = +(localStorage.getItem('bazz-sent') || 0); } catch (e) {}
      if (Date.now() - last < 60000) { return; }                   // one signup a minute per browser
      try { localStorage.setItem('bazz-sent', Date.now()); } catch (e) {}
      const btn = form.querySelector('button'); btn.disabled = true; btn.textContent = 'Sending...';
      fetch('https://formsubmit.co/ajax/bazzcoffee336@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: v, product: document.title.split('|')[0].trim().slice(0, 80), _subject: 'New ebook waitlist signup', _template: 'table', _captcha: 'false' })
      }).then(r => { if (!r.ok) throw 0; form.classList.add('sent'); btn.textContent = 'Done'; })
        .catch(() => { btn.disabled = false; btn.textContent = 'Try again'; });
    });
  }
})();
