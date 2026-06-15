/* ============================================================
   RELIER CLOTHING — Theme JS
   3 Animations:
   1. Hero Cinematic Text Reveal (CSS-driven, no JS needed)
   2. Product Card 3D Tilt (mouse tracking)
   3. Scroll-triggered Section Reveals (IntersectionObserver)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initHero();
  initScrollReveal();
  initProductTilt();
  initMobileNav();
  initNewsletterForm();
  initProductPage();
  initCart();
});

/* ── HEADER — sticky shadow + scroll state ── */
function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ── HERO — bg image load trigger for ken burns ── */
function initHero() {
  const bg = document.querySelector('.hero-bg');
  if (!bg) return;

  if (bg.complete) {
    bg.classList.add('loaded');
  } else {
    bg.addEventListener('load', () => bg.classList.add('loaded'));
  }
}

/* ============================================================
   ANIMATION 3 — SCROLL-TRIGGERED REVEALS
   IntersectionObserver watches [data-reveal] elements.
   When 20% of the element enters the viewport, 'revealed'
   class is added — CSS handles the actual transition.
   ============================================================ */
function initScrollReveal() {
  const elements = document.querySelectorAll('[data-reveal]');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

/* ============================================================
   ANIMATION 2 — PRODUCT CARD 3D TILT
   Tracks mouse position relative to card center,
   applies rotateX/rotateY + subtle lighting highlight.
   ============================================================ */
function initProductTilt() {
  const cards = document.querySelectorAll('.product-card');

  cards.forEach(card => {
    const inner = card.querySelector('.product-card-inner');
    if (!inner) return;

    const INTENSITY = 12; // max tilt degrees
    const SCALE = 1.02;

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height / 2;

      const dx = (e.clientX - cx) / (rect.width  / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);

      const rotateX = -dy * INTENSITY;
      const rotateY =  dx * INTENSITY;

      inner.style.transform = `
        perspective(800px)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
        scale3d(${SCALE}, ${SCALE}, ${SCALE})
      `;

      /* Subtle glare overlay */
      const glare = card.querySelector('.tilt-glare');
      if (glare) {
        const glareX = (dx + 1) / 2 * 100;
        const glareY = (dy + 1) / 2 * 100;
        glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.12), transparent 65%)`;
        glare.style.opacity = '1';
      }
    });

    card.addEventListener('mouseleave', () => {
      inner.style.transform = `
        perspective(800px)
        rotateX(0deg)
        rotateY(0deg)
        scale3d(1, 1, 1)
      `;
      const glare = card.querySelector('.tilt-glare');
      if (glare) glare.style.opacity = '0';
    });

    /* Inject glare element */
    const glare = document.createElement('div');
    glare.className = 'tilt-glare';
    glare.style.cssText = `
      position: absolute;
      inset: 0;
      border-radius: 4px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 3;
    `;
    card.style.position = 'relative';
    card.appendChild(glare);
  });
}

/* ── MOBILE NAV ── */
function initMobileNav() {
  const toggle = document.querySelector('.mobile-menu-toggle');
  const nav    = document.querySelector('.mobile-nav');
  const close  = document.querySelector('.mobile-nav-close');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    nav.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  const closeNav = () => {
    nav.classList.remove('open');
    document.body.style.overflow = '';
  };

  close?.addEventListener('click', closeNav);
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
}

/* ── NEWSLETTER FORM ── */
function initNewsletterForm() {
  const forms = document.querySelectorAll('.newsletter-form');

  forms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input  = form.querySelector('.newsletter-input');
      const submit = form.querySelector('.newsletter-submit');
      const email  = input?.value?.trim();

      if (!email || !isValidEmail(email)) {
        shakeElement(input);
        return;
      }

      const original = submit.textContent;
      submit.textContent = 'SENDING...';
      submit.disabled = true;

      /* Shopify newsletter form submission */
      try {
        const data = new FormData();
        data.append('contact[email]', email);
        data.append('form_type', 'customer');
        data.append('utf8', '✓');

        const res = await fetch('/contact', { method: 'POST', body: data });

        if (res.ok || res.redirected) {
          submit.textContent = 'SUBSCRIBED ✓';
          submit.style.background = '#1a6b3c';
          input.value = '';
          setTimeout(() => {
            submit.textContent = original;
            submit.style.background = '';
            submit.disabled = false;
          }, 3000);
        } else {
          throw new Error('Failed');
        }
      } catch {
        submit.textContent = 'TRY AGAIN';
        submit.disabled = false;
        setTimeout(() => { submit.textContent = original; }, 2500);
      }
    });
  });
}

/* ── PRODUCT PAGE — gallery thumbs + size/color selectors ── */
function initProductPage() {
  /* Gallery thumbnails */
  const thumbs = document.querySelectorAll('.product-thumb');
  const mainImg = document.querySelector('.product-gallery-main img');

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');

      if (mainImg) {
        const src = thumb.querySelector('img')?.src;
        if (src) {
          mainImg.style.opacity = '0';
          mainImg.style.transition = 'opacity 0.3s ease';
          setTimeout(() => {
            mainImg.src = src;
            mainImg.style.opacity = '1';
          }, 150);
        }
      }
    });
  });

  /* Color swatches */
  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      sw.closest('.product-colors')
        ?.querySelectorAll('.color-swatch')
        .forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
    });
  });

  /* Size buttons */
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.product-sizes')
        ?.querySelectorAll('.size-btn')
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  /* Add to cart button */
  const addToCart = document.querySelector('.product-add-to-cart');
  if (addToCart) {
    addToCart.addEventListener('click', () => {
      const original = addToCart.textContent;
      addToCart.textContent = 'ADDED TO CART ✓';
      addToCart.style.background = '#1a6b3c';
      addToCart.style.borderColor = '#1a6b3c';
      addToCart.style.color = 'white';
      setTimeout(() => {
        addToCart.textContent = original;
        addToCart.style.background = '';
        addToCart.style.borderColor = '';
        addToCart.style.color = '';
      }, 2000);

      /* Update cart count badge */
      const badge = document.querySelector('.cart-count');
      if (badge) {
        const current = parseInt(badge.textContent || '0', 10);
        badge.textContent = current + 1;
        badge.style.transform = 'scale(1.4)';
        setTimeout(() => badge.style.transform = '', 200);
      }
    });
  }
}

/* ── CART — quantity controls ── */
function initCart() {
  document.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const control = btn.closest('.qty-control');
      const display = control?.querySelector('.qty-value');
      if (!display) return;

      let val = parseInt(display.textContent, 10) || 1;
      if (btn.dataset.action === 'dec') val = Math.max(1, val - 1);
      if (btn.dataset.action === 'inc') val = val + 1;

      display.textContent = val;

      /* Animate value change */
      display.style.transform = 'scale(1.3)';
      display.style.transition = 'transform 0.15s ease';
      setTimeout(() => { display.style.transform = ''; }, 150);
    });
  });
}

/* ── UTILS ── */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function shakeElement(el) {
  if (!el) return;
  el.style.animation = 'none';
  el.style.borderColor = '#e53e3e';
  setTimeout(() => {
    el.style.animation = 'shake 0.4s ease';
    setTimeout(() => {
      el.style.animation = '';
      el.style.borderColor = '';
    }, 400);
  }, 10);
}

/* Inject shake keyframe once */
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
}`;
document.head.appendChild(shakeStyle);
