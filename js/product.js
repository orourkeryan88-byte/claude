/* ============================================
   RELIER — Product Page JS
   Size selection, colour swatches,
   Add to cart, wishlist, accordion
   ============================================ */

(function () {
  'use strict';

  /* ---- Colour swatches ---- */
  const swatches = document.querySelectorAll('.swatch');
  const selectedColourEl = document.getElementById('selectedColour');

  swatches.forEach(swatch => {
    swatch.addEventListener('click', function () {
      swatches.forEach(s => s.classList.remove('active'));
      this.classList.add('active');
      if (selectedColourEl) selectedColourEl.textContent = this.dataset.colour;
    });
  });

  /* ---- Size buttons ---- */
  const sizeBtns = document.querySelectorAll('.size-btn:not(:disabled)');
  const selectedSizeEl = document.getElementById('selectedSize');
  let selectedSize = null;

  sizeBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      sizeBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      selectedSize = this.dataset.size;
      if (selectedSizeEl) selectedSizeEl.textContent = selectedSize;
    });
  });

  /* ---- Add to cart ---- */
  const addToCartBtn = document.getElementById('addToCart');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', function () {
      if (!selectedSize) {
        showSizeError();
        return;
      }

      const name = document.getElementById('productName')?.textContent || 'RELIER ITEM';
      const price = document.getElementById('productPrice')?.textContent || '£0.00';
      const colour = document.getElementById('selectedColour')?.textContent || '';

      addToCart({ name, price, size: selectedSize, colour });
      showToast('ADDED TO CART — ' + selectedSize);
      pulseCartIcon();
    });
  }

  function showSizeError() {
    const sizeSection = document.querySelector('.product-option__sizes');
    if (!sizeSection) return;
    sizeSection.style.outline = '2px solid #0d0d0c';
    setTimeout(() => sizeSection.style.outline = '', 1500);
    if (window.showToast) showToast('PLEASE SELECT A SIZE');
  }

  function addToCart(item) {
    try {
      const cart = JSON.parse(localStorage.getItem('relierCart') || '[]');
      const existing = cart.find(c =>
        c.name === item.name && c.size === item.size && c.colour === item.colour
      );
      if (existing) {
        existing.qty = (existing.qty || 1) + 1;
      } else {
        cart.push({ ...item, qty: 1 });
      }
      localStorage.setItem('relierCart', JSON.stringify(cart));

      /* Update count badge */
      const count = cart.reduce((s, c) => s + (c.qty || 1), 0);
      document.querySelectorAll('#cartCount').forEach(el => {
        el.textContent = count;
        el.style.display = 'flex';
      });
    } catch (e) {}
  }

  function pulseCartIcon() {
    const icon = document.querySelector('.nav__cart');
    if (!icon) return;
    icon.style.transform = 'scale(1.3)';
    setTimeout(() => icon.style.transform = '', 300);
  }

  /* ---- Wishlist ---- */
  const wishlistBtn = document.getElementById('wishlistBtn');
  if (wishlistBtn) {
    let wishlisted = false;
    wishlistBtn.addEventListener('click', function () {
      wishlisted = !wishlisted;
      const svg = this.querySelector('svg path');
      if (svg) svg.style.fill = wishlisted ? '#0d0d0c' : 'none';
      if (window.showToast) {
        showToast(wishlisted ? 'ADDED TO WISHLIST' : 'REMOVED FROM WISHLIST');
      }
    });
  }

  /* ---- Gallery thumbs ---- */
  const thumbs = document.querySelectorAll('.product-gallery__thumb');
  thumbs.forEach(thumb => {
    thumb.addEventListener('click', function () {
      thumbs.forEach(t => t.classList.remove('product-gallery__thumb--active'));
      this.classList.add('product-gallery__thumb--active');
    });
  });

  /* ---- Breadcrumb product name ---- */
  const breadcrumb = document.getElementById('breadcrumbProduct');
  const productName = document.getElementById('productName');
  if (breadcrumb && productName) {
    breadcrumb.textContent = productName.textContent;
  }

})();
