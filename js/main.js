/* ============================================
   RELIER — Main JS
   Nav scroll, scroll animations, accordion,
   email form, toast
   ============================================ */

(function () {
  'use strict';

  /* ---- Nav scroll state ---- */
  const nav = document.getElementById('nav');
  if (nav && !nav.classList.contains('nav--light')) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 80) {
        nav.classList.add('nav--scrolled');
      } else {
        nav.classList.remove('nav--scrolled');
      }
    }, { passive: true });
  }

  /* ---- Scroll-in animations ---- */
  const animEls = document.querySelectorAll('[data-animate]');
  if (animEls.length) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add('is-visible');
            }, i * 80);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    animEls.forEach(el => observer.observe(el));
  }

  /* ---- Accordion ---- */
  document.querySelectorAll('.accordion__trigger').forEach(trigger => {
    trigger.addEventListener('click', function () {
      const item = this.closest('.accordion__item');
      const body = item.querySelector('.accordion__body');
      const isOpen = item.classList.contains('is-open');

      /* Close all */
      document.querySelectorAll('.accordion__item.is-open').forEach(openItem => {
        openItem.classList.remove('is-open');
        openItem.querySelector('.accordion__body').classList.remove('is-open');
      });

      if (!isOpen) {
        item.classList.add('is-open');
        body.classList.add('is-open');
      }
    });
  });

  /* ---- Email form ---- */
  const emailForm = document.getElementById('emailForm');
  if (emailForm) {
    emailForm.addEventListener('submit', function (e) {
      e.preventDefault();
      showToast('YOU\'RE IN. WELCOME TO RELIER.');
      emailForm.reset();
    });
  }

  /* ---- Toast notification ---- */
  window.showToast = function (msg, duration) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration || 3000);
  };

  /* ---- Lookbook horizontal drag scroll ---- */
  const lookbook = document.getElementById('lookbookScroll');
  if (lookbook) {
    let isDown = false, startX, scrollLeft;
    lookbook.addEventListener('mousedown', e => {
      isDown = true;
      startX = e.pageX - lookbook.offsetLeft;
      scrollLeft = lookbook.scrollLeft;
    });
    document.addEventListener('mouseup', () => isDown = false);
    lookbook.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - lookbook.offsetLeft;
      lookbook.scrollLeft = scrollLeft - (x - startX) * 1.5;
    });
  }

  /* ---- Init 3D logos ---- */
  if (window.RelierLogo3D) {
    const rl = window.RelierLogo3D;

    /* Hero */
    if (document.getElementById('heroCanvas')) {
      rl.initHero('heroCanvas');
    }

    /* Feature section */
    if (document.getElementById('logoCanvas')) {
      rl.initFeature('logoCanvas');
    }

    /* Email section */
    if (document.getElementById('emailLogoCanvas')) {
      rl.initSmall('emailLogoCanvas', { theme: 'dark', size: 1.8, camZ: 10 });
    }

    /* Footer logos */
    if (document.getElementById('footerLogoCanvas')) {
      rl.initSmall('footerLogoCanvas', { theme: 'dark', size: 0.3, camZ: 3 });
    }

    /* Shop header */
    if (document.getElementById('shopLogoCanvas')) {
      rl.initShopHeader('shopLogoCanvas', { theme: 'light' });
    }

    /* Product page */
    if (document.getElementById('productLogoCanvas')) {
      rl.initProduct('productLogoCanvas', { theme: 'light' });
    }

    /* Collection cards */
    rl.initCollectionCards();
  }

})();
