(function () {
  'use strict';

  /* ---- Mobile hamburger ---- */
  var hamburger = document.getElementById('navHamburger');
  var mobileMenu = document.getElementById('navMobileMenu');

  if (hamburger && mobileMenu) {
    var openMenu = function() {
      mobileMenu.classList.add('is-open');
      hamburger.classList.add('is-open');
      hamburger.setAttribute('aria-expanded', 'true');
      mobileMenu.setAttribute('aria-hidden', 'false');
      document.body.classList.add('nav-open');
    };
    var closeMenu = function() {
      mobileMenu.classList.remove('is-open');
      hamburger.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
      mobileMenu.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('nav-open');
    };
    hamburger.addEventListener('click', function() {
      mobileMenu.classList.contains('is-open') ? closeMenu() : openMenu();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeMenu();
    });
    mobileMenu.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', closeMenu);
    });
    window.addEventListener('resize', function() {
      if (window.innerWidth >= 768) closeMenu();
    }, { passive: true });
  }

  /* ---- Nav scroll state ---- */
  var nav = document.getElementById('nav');
  if (nav && !nav.classList.contains('nav--light')) {
    window.addEventListener('scroll', function() {
      nav.classList.toggle('nav--scrolled', window.scrollY > 80);
    }, { passive: true });
  }

  /* ---- Scroll-in animations ---- */
  var animEls = document.querySelectorAll('[data-animate]');
  if (animEls.length && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry, i) {
        if (entry.isIntersecting) {
          setTimeout(function() {
            entry.target.classList.add('is-visible');
          }, i * 80);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    animEls.forEach(function(el) { observer.observe(el); });
  }

  /* ---- Accordion ---- */
  document.querySelectorAll('.accordion__trigger').forEach(function(trigger) {
    trigger.addEventListener('click', function() {
      var item = this.closest('.accordion__item');
      var body = item.querySelector('.accordion__body');
      var isOpen = item.classList.contains('is-open');
      document.querySelectorAll('.accordion__item.is-open').forEach(function(openItem) {
        openItem.classList.remove('is-open');
        openItem.querySelector('.accordion__body').classList.remove('is-open');
      });
      if (!isOpen) {
        item.classList.add('is-open');
        body.classList.add('is-open');
      }
    });
  });

  /* ---- Toast ---- */
  window.showToast = function(msg, duration) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function() {
      toast.classList.remove('show');
    }, duration || 3000);
  };

  /* ---- Shopify Cart Drawer ---- */
  var cartDrawer = document.getElementById('cartDrawer');
  var cartBody = document.getElementById('cartBody');
  var cartCount = document.getElementById('cartCount');
  var cartSubtotal = document.getElementById('cartSubtotal');
  var cartToggle = document.getElementById('cartToggle');
  var cartClose = document.getElementById('cartClose');
  var cartOverlay = document.getElementById('cartOverlay');

  function openCart() {
    if (cartDrawer) {
      cartDrawer.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCart() {
    if (cartDrawer) {
      cartDrawer.classList.remove('is-open');
      document.body.style.overflow = '';
    }
  }

  if (cartToggle) cartToggle.addEventListener('click', function() {
    refreshCart();
    openCart();
  });
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  function formatMoney(cents) {
    return '£' + (cents / 100).toFixed(2);
  }

  function renderCartItems(cart) {
    if (!cartBody) return;
    if (cart.item_count === 0) {
      cartBody.innerHTML = '<p class="cart-drawer__empty">YOUR CART IS EMPTY.</p>';
    } else {
      var html = '';
      cart.items.forEach(function(item) {
        html += '<div class="cart-drawer__item">';
        html += '<img src="' + item.image + '" alt="' + item.title + '" class="cart-drawer__item-img" loading="lazy">';
        html += '<div>';
        html += '<p class="cart-drawer__item-name">' + item.product_title.toUpperCase() + '</p>';
        if (item.variant_title && item.variant_title !== 'Default Title') {
          html += '<p class="cart-drawer__item-variant">' + item.variant_title + '</p>';
        }
        html += '<p class="cart-drawer__item-price">' + formatMoney(item.final_price) + ' × ' + item.quantity + '</p>';
        html += '<button class="cart-drawer__item-remove" onclick="relierRemoveFromCart(' + item.variant_id + ')">REMOVE</button>';
        html += '</div>';
        html += '</div>';
      });
      cartBody.innerHTML = html;
    }
    if (cartSubtotal) cartSubtotal.textContent = formatMoney(cart.total_price);
    if (cartCount) {
      cartCount.textContent = cart.item_count;
      cartCount.style.display = cart.item_count > 0 ? '' : 'none';
    }
  }

  function refreshCart() {
    fetch('/cart.js')
      .then(function(r) { return r.json(); })
      .then(function(cart) { renderCartItems(cart); });
  }

  /* ---- Add to cart ---- */
  window.relierAddToCart = function(variantId, qty) {
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: qty || 1 })
    })
    .then(function(r) { return r.json(); })
    .then(function() {
      refreshCart();
      openCart();
    })
    .catch(function() {
      window.showToast('COULD NOT ADD TO CART. PLEASE TRY AGAIN.');
    });
  };

  /* ---- Remove from cart ---- */
  window.relierRemoveFromCart = function(variantId) {
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: 0 })
    })
    .then(function(r) { return r.json(); })
    .then(function(cart) { renderCartItems(cart); });
  };

  /* ---- 3D Logo init ---- */
  window.addEventListener('load', function() {
    if (window.RelierLogo3D) {
      var rl = window.RelierLogo3D;
      if (document.getElementById('heroCanvas')) rl.initHero('heroCanvas');
      if (document.getElementById('logoCanvas')) rl.initFeature('logoCanvas');
      if (document.getElementById('emailLogoCanvas')) rl.initSmall('emailLogoCanvas', { theme: 'dark', size: 1.8, camZ: 10 });
      if (document.getElementById('footerLogoCanvas')) rl.initSmall('footerLogoCanvas', { theme: 'dark', size: 0.3, camZ: 3 });
      if (document.getElementById('shopLogoCanvas')) rl.initShopHeader('shopLogoCanvas', { theme: 'light' });
      if (document.getElementById('productLogoCanvas')) rl.initProduct('productLogoCanvas', { theme: 'light' });
      rl.initCollectionCards();
    }
  });

  /* ---- Cookie banner ---- */
  var cookieBanner = document.getElementById('cookieBanner');
  var cookieAccept = document.getElementById('cookieAccept');
  if (cookieBanner && !localStorage.getItem('cookie_consent')) {
    cookieBanner.style.display = 'flex';
  }
  if (cookieAccept) {
    cookieAccept.addEventListener('click', function() {
      localStorage.setItem('cookie_consent', '1');
      if (cookieBanner) cookieBanner.style.display = 'none';
    });
  }

  /* ---- Initial cart count ---- */
  refreshCart();

})();
