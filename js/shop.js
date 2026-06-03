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
  /* Snipcart handles add-to-cart via data attributes on .snipcart-add-item buttons.
     This handler only prevents parent <a> navigation for NOTIFY ME divs. */
  document.querySelectorAll('.product-card__quick-add:not(.snipcart-add-item)').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      // Snipcart handles add-to-cart via data attributes
    });
  });

})();
