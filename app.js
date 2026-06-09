/* ─────────────────────────────────────────────
   RELIER — Tradesman Finder
   Google Places API integration
───────────────────────────────────────────── */

const STORAGE_KEY = 'relier_gapi_key';

let placesService = null;
let geocoder      = null;
let allPlaces     = [];
let shownPlaces   = [];
let lastTradeType = '';

// ── Boot ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    bindUI();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        loadGoogleMapsAPI(saved);
    } else {
        document.getElementById('api-modal').classList.remove('hidden');
    }
});

function bindUI() {
    document.getElementById('save-api-key-btn').addEventListener('click', handleSaveKey);
    document.getElementById('api-key-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') handleSaveKey();
    });
    document.getElementById('change-api-key').addEventListener('click', () => {
        document.getElementById('api-modal').classList.remove('hidden');
        setTimeout(() => document.getElementById('api-key-input').focus(), 80);
    });

    document.getElementById('search-form').addEventListener('submit', handleSearch);
    document.getElementById('use-location-btn').addEventListener('click', useMyLocation);
    document.getElementById('close-detail').addEventListener('click', closeDetail);
    document.getElementById('export-csv-btn').addEventListener('click', exportCSV);

    document.getElementById('detail-modal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeDetail();
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeDetail();
    });
}

// ── API Key ───────────────────────────────────
function handleSaveKey() {
    const key   = document.getElementById('api-key-input').value.trim();
    const errEl = document.getElementById('api-key-error');

    if (!key.startsWith('AIza') || key.length < 25) {
        errEl.textContent = 'Enter a valid Google API key (begins with AIza…).';
        errEl.classList.remove('hidden');
        return;
    }
    errEl.classList.add('hidden');
    localStorage.setItem(STORAGE_KEY, key);
    loadGoogleMapsAPI(key);
}

function loadGoogleMapsAPI(apiKey) {
    showLoading('Connecting to Google Places…');

    // Remove stale script if key changed
    const old = document.getElementById('gmap-script');
    if (old) old.remove();

    window._relierGmapsReady = () => {
        try {
            const mapEl = document.getElementById('map-hidden');
            const map   = new google.maps.Map(mapEl, { center: { lat: 0, lng: 0 }, zoom: 10 });
            placesService = new google.maps.places.PlacesService(map);
            geocoder      = new google.maps.Geocoder();
            hideLoading();
            document.getElementById('api-modal').classList.add('hidden');
        } catch (err) {
            hideLoading();
            showApiKeyError('Failed to initialise Google Maps. Check your API key has Places API enabled.');
        }
    };

    const script   = document.createElement('script');
    script.id      = 'gmap-script';
    script.src     = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=_relierGmapsReady`;
    script.async   = true;
    script.defer   = true;
    script.onerror = () => {
        hideLoading();
        showApiKeyError('Could not load Google Maps API. Check your key and internet connection.');
        document.getElementById('api-modal').classList.remove('hidden');
    };
    document.head.appendChild(script);
}

function showApiKeyError(msg) {
    const el = document.getElementById('api-key-error');
    el.textContent = msg;
    el.classList.remove('hidden');
    document.getElementById('api-modal').classList.remove('hidden');
}

// ── Geolocation ───────────────────────────────
function useMyLocation() {
    if (!navigator.geolocation) return;
    const btn = document.getElementById('use-location-btn');
    btn.style.color = 'var(--primary)';

    navigator.geolocation.getCurrentPosition(
        pos => {
            const { latitude: lat, longitude: lng } = pos.coords;
            if (geocoder) {
                geocoder.geocode({ location: { lat, lng } }, (res, status) => {
                    document.getElementById('location').value =
                        (status === 'OK' && res[0]) ? res[0].formatted_address : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                    btn.style.color = '';
                });
            } else {
                document.getElementById('location').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                btn.style.color = '';
            }
        },
        () => { btn.style.color = ''; }
    );
}

// ── Search ────────────────────────────────────
async function handleSearch(e) {
    e.preventDefault();

    if (!placesService) {
        document.getElementById('api-modal').classList.remove('hidden');
        return;
    }

    const tradeType    = document.getElementById('trade-type').value;
    const locationStr  = document.getElementById('location').value.trim();
    const radius       = parseInt(document.getElementById('radius').value);
    const noWebOnly    = document.getElementById('no-website-only').checked;

    if (!tradeType)    { alert('Please select a trade type.'); return; }
    if (!locationStr)  { alert('Please enter a location.'); return; }

    lastTradeType = tradeType;
    allPlaces     = [];
    shownPlaces   = [];

    document.getElementById('results-section').classList.add('hidden');
    document.getElementById('results-grid').innerHTML = '';
    document.getElementById('no-results').classList.add('hidden');

    showLoading('Searching for tradesmen…');

    let coords;
    try {
        coords = await geocodeLocation(locationStr);
    } catch (err) {
        hideLoading();
        alert('Could not find that location. Please try a more specific address.');
        return;
    }

    let raw = [];
    try {
        raw = await doTextSearch(`${tradeType} near ${locationStr}`, coords, radius);
    } catch (err) {
        hideLoading();
        if (err.message && err.message.includes('REQUEST_DENIED')) {
            showApiKeyError('API key denied. Make sure Places API is enabled in Google Cloud Console.');
        } else {
            alert('Search failed: ' + (err.message || 'Unknown error'));
        }
        return;
    }

    hideLoading();

    if (!raw.length) {
        renderResults([], noWebOnly);
        return;
    }

    showProgress(0, raw.length, `Fetching details 0 / ${raw.length}…`);

    const detailed = [];
    for (let i = 0; i < raw.length; i++) {
        setProgress(i + 1, raw.length, `Fetching details ${i + 1} / ${raw.length} — ${raw[i].name}`);
        const detail = await fetchDetails(raw[i].place_id);
        if (detail) detailed.push(mergePlace(raw[i], detail));
        await pause(120);
    }

    hideProgress();
    allPlaces   = detailed;
    shownPlaces = noWebOnly ? detailed.filter(p => !p.website) : detailed;
    renderResults(shownPlaces, noWebOnly);
}

function geocodeLocation(str) {
    return new Promise((resolve, reject) => {
        const coords = str.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
        if (coords) {
            resolve({ lat: parseFloat(coords[1]), lng: parseFloat(coords[2]) });
            return;
        }
        geocoder.geocode({ address: str }, (res, status) => {
            if (status === 'OK' && res[0]) {
                const loc = res[0].geometry.location;
                resolve({ lat: loc.lat(), lng: loc.lng() });
            } else {
                reject(new Error('Location not found'));
            }
        });
    });
}

function doTextSearch(query, location, radius) {
    return new Promise((resolve, reject) => {
        placesService.textSearch({
            query,
            location: new google.maps.LatLng(location.lat, location.lng),
            radius
        }, (results, status) => {
            const S = google.maps.places.PlacesServiceStatus;
            if      (status === S.OK)            resolve(results || []);
            else if (status === S.ZERO_RESULTS)  resolve([]);
            else                                 reject(new Error(status));
        });
    });
}

function fetchDetails(placeId) {
    return new Promise(resolve => {
        placesService.getDetails({
            placeId,
            fields: [
                'name', 'place_id',
                'formatted_phone_number', 'international_phone_number',
                'formatted_address', 'website', 'url',
                'rating', 'user_ratings_total', 'reviews',
                'business_status', 'opening_hours', 'types', 'geometry'
            ]
        }, (place, status) => {
            resolve(status === google.maps.places.PlacesServiceStatus.OK ? place : null);
        });
    });
}

function mergePlace(base, detail) {
    return { ...base, ...detail };
}

// ── Render ────────────────────────────────────
function renderResults(places, noWebOnly) {
    const section = document.getElementById('results-section');
    const grid    = document.getElementById('results-grid');
    const noRes   = document.getElementById('no-results');
    const title   = document.getElementById('results-title');
    const meta    = document.getElementById('results-count');

    section.classList.remove('hidden');
    grid.innerHTML = '';

    title.textContent = cap(lastTradeType) + ' Results';

    if (!places.length) {
        noRes.classList.remove('hidden');
        meta.textContent = noWebOnly
            ? `All ${allPlaces.length} results have a website — try unchecking "No website only"`
            : '0 results found';
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }

    noRes.classList.add('hidden');
    const label = noWebOnly ? 'tradesmen without a website' : 'tradesmen';
    meta.textContent = `${places.length} ${label} found`;

    places.forEach(p => grid.appendChild(buildCard(p)));
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildCard(place) {
    const phone   = place.formatted_phone_number || place.international_phone_number || null;
    const rating  = place.rating ?? null;
    const count   = place.user_ratings_total ?? 0;
    const addr    = place.formatted_address || 'Address unavailable';
    const noWeb   = !place.website;

    const card = document.createElement('div');
    card.className = 'result-card';

    card.innerHTML = `
        <div class="card-top">
            <div class="card-name">${esc(place.name)}</div>
            <span class="badge ${noWeb ? 'badge-no-website' : 'badge-has-website'}">${noWeb ? 'No Website' : 'Has Website'}</span>
        </div>
        <div class="card-trade">${cap(lastTradeType)}</div>
        <div class="card-rating">
            ${rating !== null
                ? `<span class="stars">${stars(rating)}</span>
                   <span class="rating-score">${rating.toFixed(1)}</span>
                   <span class="rating-count">(${count.toLocaleString()} review${count !== 1 ? 's' : ''})</span>`
                : `<span class="rating-count">No ratings yet</span>`}
        </div>
        <div class="card-info">
            <div class="info-row">
                ${iconPhone()}
                ${phone
                    ? `<span class="info-val phone">${esc(phone)}</span>`
                    : `<span class="info-val" style="color:var(--muted)">Phone not listed</span>`}
            </div>
            <div class="info-row">
                ${iconPin()}
                <span class="info-val">${esc(addr)}</span>
            </div>
        </div>
        <div class="card-actions">
            ${place.url
                ? `<a href="${esc(place.url)}" target="_blank" rel="noopener noreferrer"
                      class="btn-action btn-maps" onclick="event.stopPropagation()">
                       ${iconMap()} Google Maps
                   </a>`
                : ''}
            <a href="${emailSearchUrl(place.name, addr)}" target="_blank" rel="noopener noreferrer"
               class="btn-action btn-email" onclick="event.stopPropagation()">
               ${iconEmail()} Find Email
            </a>
            ${phone
                ? `<button class="btn-action btn-copy"
                           data-phone="${esc(phone)}"
                           onclick="event.stopPropagation(); copyPhone(this)">
                       ${iconCopy()} Copy Phone
                   </button>`
                : ''}
        </div>`;

    card.addEventListener('click', e => {
        if (e.target.closest('a, button')) return;
        openDetail(place);
    });

    return card;
}

// ── Detail modal ──────────────────────────────
function openDetail(place) {
    const modal   = document.getElementById('detail-modal');
    const content = document.getElementById('detail-content');

    const phone  = place.formatted_phone_number || place.international_phone_number || null;
    const rating = place.rating ?? null;
    const addr   = place.formatted_address || 'N/A';
    const noWeb  = !place.website;
    const revs   = Array.isArray(place.reviews) ? place.reviews : [];

    content.innerHTML = `
        <div class="detail-header">
            <div class="detail-name">${esc(place.name)}</div>
            <div class="detail-badges">
                <span class="badge ${noWeb ? 'badge-no-website' : 'badge-has-website'}">${noWeb ? 'No Website' : 'Has Website'}</span>
                <span class="badge" style="background:var(--primary-glow);color:var(--primary);border:1px solid rgba(59,130,246,0.3)">${cap(lastTradeType)}</span>
            </div>
            ${rating !== null ? `
            <div class="detail-rating">
                <span class="detail-stars">${stars(rating)}</span>
                <span class="detail-score">${rating.toFixed(1)}</span>
                <span class="detail-rcount">&nbsp;(${(place.user_ratings_total || 0).toLocaleString()} reviews)</span>
            </div>` : ''}
        </div>

        <div class="detail-actions">
            ${place.url
                ? `<a href="${esc(place.url)}" target="_blank" rel="noopener noreferrer" class="btn-action btn-maps">
                       ${iconMap()} Open in Google Maps
                   </a>`
                : ''}
            ${phone
                ? `<a href="tel:${esc(phone.replace(/\s+/g, ''))}" class="btn-action"
                      style="background:var(--success-bg);color:var(--success);border-color:var(--success-bd)">
                       ${iconPhone()} Call Now
                   </a>`
                : ''}
        </div>

        <div class="detail-section">
            <h3>Contact Information</h3>
            <div class="contact-grid">
                <div class="contact-item">
                    ${iconPhone()}
                    <div>
                        <div class="contact-label">Phone</div>
                        <div class="contact-value ${phone ? 'is-phone' : ''}">${phone ? esc(phone) : 'Not listed'}</div>
                    </div>
                </div>
                <div class="contact-item">
                    ${iconEmail()}
                    <div>
                        <div class="contact-label">Email</div>
                        <div class="contact-value" style="color:var(--muted)">Not in public API</div>
                    </div>
                </div>
                <div class="contact-item full">
                    ${iconPin()}
                    <div>
                        <div class="contact-label">Address</div>
                        <div class="contact-value">${esc(addr)}</div>
                    </div>
                </div>
                ${place.website
                    ? `<div class="contact-item full">
                           ${iconGlobe()}
                           <div>
                               <div class="contact-label">Website</div>
                               <div class="contact-value">
                                   <a href="${esc(place.website)}" target="_blank" rel="noopener noreferrer">${esc(place.website)}</a>
                               </div>
                           </div>
                       </div>`
                    : ''}
            </div>
        </div>

        <div class="detail-section">
            <h3>Find Their Email</h3>
            <div class="email-finder-box">
                <p>Email isn't provided by Google Places. Use these tools to track it down:</p>
                <div class="email-link-list">
                    ${buildEmailLinks(place.name, addr)}
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>Customer Reviews ${revs.length ? `(${revs.length})` : ''}</h3>
            ${revs.length
                ? `<div class="review-list">${revs.map(renderReview).join('')}</div>`
                : `<p class="no-reviews">No reviews available for this tradesman.</p>`}
        </div>`;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeDetail() {
    document.getElementById('detail-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

function renderReview(r) {
    return `
        <div class="review-item">
            <div class="review-top">
                <span class="review-author">${esc(r.author_name || 'Anonymous')}</span>
                <span class="review-stars">${stars(r.rating || 0)}</span>
            </div>
            <div class="review-time">${esc(r.relative_time_description || '')}</div>
            <div class="review-text">${esc(r.text || '(no text)')}</div>
        </div>`;
}

// ── Email finder links ────────────────────────
function emailSearchUrl(name, addr) {
    const city  = addr.split(',').slice(-3, -1).join(',').trim();
    return `https://www.google.com/search?q=${encodeURIComponent(`"${name}" ${city} email contact`)}`;
}

function buildEmailLinks(name, addr) {
    const city    = addr.split(',').slice(-3, -1).join(',').trim();
    const nameEnc = encodeURIComponent(name);
    const qEnc    = encodeURIComponent(`"${name}" ${city} email`);
    const fbEnc   = encodeURIComponent(name);

    const links = [
        {
            label:  'Google — search for their email',
            badge:  'Google',
            url:    `https://www.google.com/search?q=${qEnc}`,
            icon:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`
        },
        {
            label:  'Yell.com — UK business directory',
            badge:  'Yell',
            url:    `https://www.yell.com/s/${encodeURIComponent(name)}/`,
            icon:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3l-4 4-4-4"/></svg>`
        },
        {
            label:  'Checkatrade — trade profile',
            badge:  'Checkatrade',
            url:    `https://www.checkatrade.com/search?q=${nameEnc}`,
            icon:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
        },
        {
            label:  'Facebook — find their page',
            badge:  'Facebook',
            url:    `https://www.facebook.com/search/pages/?q=${fbEnc}`,
            icon:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`
        },
        {
            label:  'Hunter.io — email finder',
            badge:  'Hunter',
            url:    `https://hunter.io/search/${encodeURIComponent(name.toLowerCase().replace(/[^a-z0-9]/g, ''))}`,
            icon:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`
        }
    ];

    return links.map(l =>
        `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" class="email-link">
            ${l.icon}
            ${esc(l.label)}
            <span class="source-badge">${esc(l.badge)}</span>
        </a>`
    ).join('');
}

// ── CSV Export ────────────────────────────────
function exportCSV() {
    if (!shownPlaces.length) return;

    const headers = ['Name', 'Trade', 'Phone', 'Address', 'Rating', 'Review Count', 'Website', 'Google Maps URL'];
    const rows    = shownPlaces.map(p => [
        p.name || '',
        lastTradeType,
        p.formatted_phone_number || p.international_phone_number || '',
        p.formatted_address || '',
        p.rating || '',
        p.user_ratings_total || '',
        p.website || '',
        p.url || ''
    ]);

    const csv  = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
        href:     url,
        download: `relier-${lastTradeType.replace(/\s+/g, '-')}-${Date.now()}.csv`
    });
    a.click();
    URL.revokeObjectURL(url);
}

// ── Copy phone ────────────────────────────────
function copyPhone(btn) {
    const phone = btn.dataset.phone;
    if (!phone) return;
    navigator.clipboard.writeText(phone).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = `${iconCheck()} Copied!`;
        btn.classList.add('btn-copied');
        setTimeout(() => {
            btn.innerHTML = orig;
            btn.classList.remove('btn-copied');
        }, 1800);
    });
}

// ── UI helpers ────────────────────────────────
function showLoading(text) {
    document.getElementById('loading-text').textContent = text || 'Loading…';
    document.getElementById('loading').classList.remove('hidden');
}
function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showProgress(cur, total, text) {
    const wrap = document.getElementById('progress-wrap');
    wrap.classList.remove('hidden');
    document.getElementById('progress-text').textContent  = text;
    document.getElementById('progress-fill').style.width  = `${total ? (cur / total) * 100 : 0}%`;
}
function setProgress(cur, total, text) {
    document.getElementById('progress-text').textContent = text;
    document.getElementById('progress-fill').style.width = `${(cur / total) * 100}%`;
}
function hideProgress() {
    document.getElementById('progress-wrap').classList.add('hidden');
    document.getElementById('progress-fill').style.width = '0%';
}

// ── Misc helpers ──────────────────────────────
function pause(ms) { return new Promise(r => setTimeout(r, ms)); }

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

function cap(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function stars(rating) {
    const full  = Math.round(rating);
    const empty = 5 - full;
    return '★'.repeat(Math.max(0, full)) + '☆'.repeat(Math.max(0, empty));
}

// ── SVG icon snippets ─────────────────────────
function iconPhone() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.71 4.87 2 2 0 0 1 3.69 2.71h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 10.09a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`; }
function iconEmail() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`; }
function iconPin()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`; }
function iconMap()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`; }
function iconCopy()  { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`; }
function iconCheck() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`; }
function iconGlobe() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`; }
