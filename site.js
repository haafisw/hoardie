// Hoardie site motion: smooth scroll, reveals, scroll-linked parallax and the "link to library" story.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  // Phones: real app captures (they already carry the 9:41 status bar).
  $$('.phone[data-img]').forEach((p) => {
    p.innerHTML = `<div class="scr"><img src="${p.dataset.img}" alt="" loading="lazy" decoding="async"></div>`;
  });

  // Headline words rise one by one.
  $$('[data-words]').forEach((h) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const w = document.createElement('span'); w.className = 'w';
            const s = document.createElement('span'); s.textContent = part;
            w.append(s); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          const w = document.createElement('span'); w.className = 'w';
          const s = document.createElement('span');
          n.replaceWith(w); s.append(n); w.append(s);
        }
      });
    };
    walk(h);
    $$('.w > span', h).forEach((s, i) => s.style.setProperty('--d', `${0.08 + i * 0.07}s`));
  });

  // Reveal on enter.
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  $$('.rv, [data-words]').forEach((el) => io.observe(el));

  // Hoardie rises into its icon as the page settles, and again at the end.
  requestAnimationFrame(() => setTimeout(() => $('#heroMark')?.classList.add('up'), 250));
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { e.target.classList.add('up'); o.disconnect(); } }, { threshold: .6 })
    .observe($('#finalMark'));

  // Count-ups.
  const fmt = (n) => n.toLocaleString('en-US');
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target, to = +el.dataset.count;
      const t0 = performance.now(), dur = reduce ? 1 : 1200;
      const tick = (t) => {
        const k = ease(clamp((t - t0) / dur));
        el.textContent = fmt(Math.round(to * k));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: .5 });
  $$('[data-count]').forEach((el) => countIO.observe(el));

  // History filter chips.
  $$('#seg span').forEach((s, _, all) => s.addEventListener('click', () => { all.forEach((x) => x.classList.toggle('on', x === s)); }));

  // The Hoardie button's eyes follow the pointer.
  const pupils = $$('#orb .eye i');
  addEventListener('pointermove', (e) => {
    pupils.forEach((p) => {
      const r = p.parentElement.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.min(1, Math.hypot(dx, dy) / 160) * 5.5, a = Math.atan2(dy, dx);
      p.style.transform = `translate(${(Math.cos(a) * d).toFixed(2)}px, ${(Math.sin(a) * d).toFixed(2)}px)`;
    });
  }, { passive: true });
  $('#orb')?.addEventListener('click', (e) => e.currentTarget.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(.9) translateY(4px)' }, { transform: 'translateY(-10px)' }, { transform: 'none' }],
    { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)' }));

  // Smooth FAQ open/close.
  $$('.faq details').forEach((d) => {
    const s = $('summary', d), a = $('.ans', d);
    s.addEventListener('click', (e) => {
      if (reduce) return;
      e.preventDefault();
      if (d.open) {
        a.animate([{ height: a.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.7,0,.84,0)' })
          .onfinish = () => { d.open = false; };
      } else {
        d.open = true;
        const h = a.offsetHeight;
        a.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    });
  });
  // "Get the beta" opens its answer.
  $$('a[href="#beta"]').forEach((a) => a.addEventListener('click', () => { $('#beta').open = true; }));

  // Film: plays while on screen, sound on request.
  const film = $('#film-frame'), video = $('#filmVideo'), snd = $('#soundBtn');
  if (video) {
    let inView = false;
    const sync = () => { inView ? video.play().catch(() => {}) : video.pause(); };
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { threshold: .35 }).observe(video);
    video.addEventListener('loadeddata', sync);
    snd.addEventListener('click', () => {
      video.muted = !video.muted;
      if (!video.muted) { video.currentTime = 0; video.play(); }
      $('#sndOff').hidden = !video.muted; $('#sndOn').hidden = video.muted;
      snd.setAttribute('aria-label', video.muted ? 'Turn sound on' : 'Turn sound off');
    });
  }

  const nav = $('#nav');

  // Story: paste → preview → save → kept, driven by scroll through the pinned section.
  const story = $('#how'), steps = $$('#steps span');
  const url = 'instagram.com/p/ridge', aUrl = $('#aUrl'), aCaret = $('#aCaret'), aGo = $('#aGo');
  const aMedia = $('#aMedia'), aFill = $('#aFill'), aTxt = $('#aSaveTxt'), aToast = $('#aToast');
  const cTaps = $('#cTaps'), cMb = $('#cMb');
  const storyAt = (p) => {
    const typed = Math.round(clamp(p / .22) * url.length);
    aUrl.textContent = url.slice(0, typed);
    aCaret.style.display = p < .26 ? '' : 'none';
    aGo.classList.toggle('on', typed === url.length);
    aMedia.classList.toggle('loaded', p >= .42);
    const s = clamp((p - .55) / .25);
    aFill.style.transform = `scaleX(${p >= .8 ? 0 : ease(s)})`;
    aTxt.textContent = p >= .8 ? '✓  Saved to Photos' : p >= .55 ? `Saving ${Math.round(ease(s) * 100)}%` : 'Save to Photos';
    aToast.classList.toggle('on', p >= .8);
    const step = p >= .8 ? 3 : p >= .55 ? 2 : p >= .3 ? 1 : 0;
    steps.forEach((el, i) => el.classList.toggle('on', i === step));
    cTaps.textContent = p >= .55 ? 2 : p >= .26 ? 1 : 0;
    cMb.textContent = `${(ease(s) * 9.4).toFixed(1)} MB`;
  };
  if (innerWidth <= 900 || reduce) storyAt(1);

  // Scroll-linked frame.
  const stage = $('#stage'), par = $$('[data-par]'), mac = $('#macShot');
  let lastY = -1;
  const frame = () => {
    const y = scrollY, vh = innerHeight;
    if (y !== lastY) {
      lastY = y;
      nav.classList.toggle('scrolled', y > 10);

      if (!reduce && stage) {
        const r = stage.getBoundingClientRect();
        const k = clamp(1 - r.top / vh);
        par.forEach((el) => {
          const f = +el.dataset.par;
          const tilt = el.classList.contains('p-center') ? (1 - clamp(k * 1.6)) * 14 : 0;
          el.style.transform = `translateY(${(y * f).toFixed(1)}px) rotateX(${tilt.toFixed(2)}deg)`;
        });
      }

      if (story && innerWidth > 900 && !reduce) {
        const r = story.getBoundingClientRect();
        storyAt(clamp(-r.top / (r.height - vh)));
      }

      if (!reduce && film) {
        const r = film.getBoundingClientRect();
        const k = ease(clamp((vh - r.top) / (vh * .85)));
        film.style.transform = `scale(${(0.84 + k * 0.16).toFixed(4)})`;
        film.style.borderRadius = `${(56 - k * 20).toFixed(1)}px`;
      }

      if (!reduce && mac) {
        const r = mac.getBoundingClientRect();
        const k = clamp((vh - r.top) / (vh * .9));
        mac.style.transform = `perspective(1400px) rotateX(${((1 - ease(k)) * 18).toFixed(2)}deg) scale(${(0.9 + ease(k) * 0.1).toFixed(3)})`;
      }
    }
  };

  // Lenis smooth scrolling when available; plain scroll otherwise.
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href'); if (id.length < 2) return;
      const t = $(id); if (!t) return;
      e.preventDefault(); lenis.scrollTo(t, { offset: -40 });
    }));
  }
  const loop = (t) => { lenis?.raf(t); frame(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
})();
