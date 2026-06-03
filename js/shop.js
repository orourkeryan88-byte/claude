/* ============================================
   RELIER — Shop Page JS
   Category filtering + sorting
   ============================================ */

(function () {
  'use strict';

  const grid = document.getElementById('shopGrid');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const sortSelect = document.getElementById('sortSelect');
  const titleEl = document.getElementById('shopTitle');

  if (!grid) return;

  const catLabels = {
    all: 'ALL PRODUCTS',
    new: 'NEW ARRIVALS',
    tops: 'TOPS',
    bottoms: 'BOTTOMS',
    outerwear: 'OUTERWEAR',
    accessories: 'ACCESSORIES',
  };

  let activeCat = 'all';

  /* Read URL param on load */
  const urlCat = new URLSearchParams(window.location.search).get('cat');
  if (urlCat && catLabels[urlCat]) {
    activeCat = urlCat;
    if (titleEl) titleEl.textContent = catLabels[urlCat];
    filterBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === urlCat);
    });
    filterProducts();
  }

  /* Filter buttons */
  filterBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      activeCat = this.dataset.cat;
      if (titleEl) titleEl.textContent = catLabels[activeCat] || 'ALL PRODUCTS';
      filterProducts();
    });
  });

  /* Sort */
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      filterProducts();
    });
  }

  function filterProducts() {
    const cards = Array.from(grid.querySelectorAll('.product-card'));
    const sortVal = sortSelect ? sortSelect.value : 'featured';

    /* Filter */
    cards.forEach(card => {
      const cats = (card.dataset.cat || '').split(' ');
      const show = activeCat === 'all' || cats.includes(activeCat);
      card.style.display = show ? '' : 'none';
    });

    /* Sort visible cards */
    const visible = cards.filter(c => c.style.display !== 'none');
    visible.sort((a, b) => {
      if (sortVal === 'price-asc') {
        return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
      } else if (sortVal === 'price-desc') {
        return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
      }
      return 0;
    });

    visible.forEach(card => grid.appendChild(card));
  }

  /* ---- Quick Add to Cart ---- */
  function addToCartItem(item) {
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
      const count = cart.reduce((s, c) => s + (c.qty || 1), 0);
      document.querySelectorAll('#cartCount').forEach(el => {
        el.textContent = count;
        el.style.display = 'flex';
      });
    } catch (e) {}
  }

  document.querySelectorAll('.product-card__quick-add').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      if (this.textContent.trim() === 'NOTIFY ME') return;
      e.preventDefault();
      e.stopPropagation();

      const card = this.closest('.product-card');
      const name = card.querySelector('.product-card__name')?.textContent || 'RELIER ITEM';
      const priceNum = parseFloat(card.dataset.price || '0');
      const price = '£' + priceNum.toFixed(2);
      const colour = card.querySelector('.product-card__sub')?.textContent || '';
      const cats = (card.dataset.cat || '').split(' ');
      const size = cats.includes('accessories') ? 'One Size' : 'M';

      addToCartItem({ name, price, colour, size });

      if (window.showToast) window.showToast('ADDED TO CART');

      const cartIcon = document.querySelector('.nav__cart');
      if (cartIcon) {
        cartIcon.style.transform = 'scale(1.3)';
        setTimeout(() => cartIcon.style.transform = '', 300);
      }
    });
  });

})();
