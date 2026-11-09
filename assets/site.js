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
      if (!email.value || !email.checkValidity()) { email.focus(); return; }
      const btn = form.querySelector('button'); btn.disabled = true; btn.textContent = 'Sending...';
      fetch('https://formsubmit.co/ajax/bazzcoffee336@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: email.value, product: 'AI for Beginners ebook', _subject: 'New ebook waitlist signup', _template: 'table', _captcha: 'false' })
      }).then(r => { if (!r.ok) throw 0; form.classList.add('sent'); btn.textContent = 'Done'; })
        .catch(() => { btn.disabled = false; btn.textContent = 'Try again'; });
    });
  }
})();
