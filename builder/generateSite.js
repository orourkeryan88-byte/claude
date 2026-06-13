const SERVICES_MAP = {
  'Plumber': ['Emergency Plumbing','Boiler Installation & Repair','Bathroom Fitting','Leak Detection','Drain Unblocking','Central Heating'],
  'Plumber / Heating': ['Boiler Installation & Servicing','Central Heating Systems','Bathroom Fitting','Emergency Plumbing','Radiator Installation','Underfloor Heating'],
  'Electrician': ['Full House Rewiring','Fuse Board Upgrades','Socket & Switch Installation','CCTV & Alarms','EV Charger Installation','Lighting Design'],
  'Painter & Decorator': ['Interior Painting','Exterior Painting','Wallpaper Hanging','Feature Walls','Colour Consultancy','Commercial Painting'],
  'Builder': ['House Extensions','Full Renovations','Attic Conversions','Garage Conversions','Structural Work','Groundwork & Foundations'],
  'Plasterer': ['Full Room Plastering','Skim Coating','Dry Lining','Coving & Cornicing','Patch Repair','External Rendering'],
  'Roofer': ['Roof Repairs','New Roof Installation','Flat Roofing','Chimney Repointing','Guttering & Fascias','Roof Inspections'],
  'Carpenter': ['Bespoke Furniture','Fitted Wardrobes','Kitchen Fitting','Skirting & Architrave','Hardwood Flooring','Staircase Restoration'],
  'Carpenter / Builder': ['Bespoke Carpentry','House Extensions','Fitted Wardrobes','Kitchen Fitting','Structural Work','Flooring'],
  'Handyman': ['Furniture Assembly','TV Wall Mounting','Shelving & Storage','Tiling','Door Hanging','General Repairs'],
  'Handyman / Carpenter': ['Furniture Assembly','Bespoke Carpentry','TV Wall Mounting','Tiling','Door Hanging','General Repairs'],
  'Gardener / Landscaper': ['Garden Design','Lawn Care & Mowing','Decking & Patios','Hedge Trimming','Tree Surgery','Garden Clearance'],
  'Power Washing': ['Driveway Cleaning','Patio & Decking Cleaning','Roof & Gutter Cleaning','Block Paving','Commercial Pressure Washing','Graffiti Removal'],
  'Power Washing / Garden Maintenance': ['Driveway Cleaning','Patio Cleaning','Garden Maintenance','Lawn Care','Hedge Trimming','Pressure Washing'],
  'Glazier': ['Window Repair','Emergency Glass Replacement','Double Glazing','Shower Screens','Glass Partitions','Mirror Installation'],
  'Gas / Heating': ['Gas Boiler Service','Boiler Installation','Gas Leak Detection','Central Heating','Underfloor Heating','Annual Service'],
};

const THEMES = {
  blue:   { primary: '#1e40af', dark: '#1e3a8a', mid: '#3b82f6', light: '#dbeafe', text: '#1e3a8a' },
  green:  { primary: '#166534', dark: '#14532d', mid: '#16a34a', light: '#dcfce7', text: '#14532d' },
  orange: { primary: '#c2410c', dark: '#9a3412', mid: '#ea580c', light: '#ffedd5', text: '#9a3412' },
  slate:  { primary: '#334155', dark: '#1e293b', mid: '#64748b', light: '#f1f5f9', text: '#1e293b' },
  purple: { primary: '#6d28d9', dark: '#4c1d95', mid: '#7c3aed', light: '#ede9fe', text: '#4c1d95' },
  red:    { primary: '#b91c1c', dark: '#991b1b', mid: '#ef4444', light: '#fee2e2', text: '#991b1b' },
};

const SERVICE_ICONS = {
  'Emergency': '🚨', 'Boiler': '🔥', 'Bathroom': '🛁', 'Leak': '💧', 'Drain': '🪠',
  'Central Heating': '🌡️', 'Rewiring': '⚡', 'Fuse': '⚡', 'Socket': '🔌', 'CCTV': '📹',
  'EV': '🚗', 'Lighting': '💡', 'Interior': '🖌️', 'Exterior': '🏠', 'Wallpaper': '🎨',
  'Feature': '✨', 'Extension': '🏗️', 'Renovation': '🔨', 'Attic': '🏠', 'Garage': '🚗',
  'Structural': '🏗️', 'Plastering': '🪣', 'Skim': '🪣', 'Dry Lining': '📐', 'Coving': '✨',
  'Patch': '🔧', 'Rendering': '🪣', 'Roof Repair': '🏠', 'New Roof': '🏠', 'Flat Roof': '🏠',
  'Chimney': '🏡', 'Guttering': '🌧️', 'Bespoke': '🪚', 'Wardrobe': '🪚', 'Kitchen': '🍳',
  'Skirting': '📏', 'Flooring': '🪵', 'Staircase': '🪜', 'Furniture': '🛋️', 'TV': '📺',
  'Shelving': '📚', 'Tiling': '🔲', 'Door': '🚪', 'Garden Design': '🌺', 'Lawn': '🌿',
  'Decking': '🪵', 'Hedge': '🌳', 'Tree': '🌲', 'Clearance': '🧹', 'Driveway': '🧹',
  'Patio': '🧹', 'Commercial Pressure': '💧', 'Graffiti': '🧽', 'Window': '🪟', 'Glass': '🪟',
  'Double Glazing': '🪟', 'Shower': '🚿', 'Gas': '🔥', 'Underfloor': '🌡️', 'Annual': '📋',
};

function getIcon(service) {
  for (const [key, icon] of Object.entries(SERVICE_ICONS)) {
    if (service.includes(key)) return icon;
  }
  return '✅';
}

function getServices(data) {
  if (data.services && data.services.length > 0) return data.services.slice(0, 6);
  const trade = data.trade || '';
  return SERVICES_MAP[trade] || SERVICES_MAP['Handyman'];
}

function getHeadline(data) {
  const tradeWords = {
    'Plumber': 'Plumbing', 'Plumber / Heating': 'Plumbing & Heating', 'Electrician': 'Electrical',
    'Painter & Decorator': 'Painting & Decorating', 'Builder': 'Building', 'Plasterer': 'Plastering',
    'Roofer': 'Roofing', 'Carpenter': 'Carpentry', 'Handyman': 'Handyman', 'Gardener / Landscaper': 'Landscaping',
    'Power Washing': 'Pressure Washing', 'Glazier': 'Glazing', 'Gas / Heating': 'Gas & Heating',
  };
  const word = tradeWords[data.trade] || data.trade || 'Trade';
  return data.tagline || `Trusted ${word} Services in ${data.area || 'Dublin'}`;
}

function getCerts(data) {
  if (!data.certifications) return [];
  return data.certifications.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
}

module.exports = function generateSite(data) {
  const theme = THEMES[data.colorTheme || 'blue'];
  const services = getServices(data);
  const certs = getCerts(data);
  const headline = getHeadline(data);
  const phone = data.phone || '';
  const email = data.email || '';
  const years = data.yearsExperience || '';
  const ownerName = data.ownerName || '';
  const area = data.area || 'Dublin';
  const extra = data.extra || '';

  const serviceCards = services.map(s => `
    <div class="service-card">
      <div class="service-icon">${getIcon(s)}</div>
      <h3>${s}</h3>
      <p>Professional ${s.toLowerCase()} service with guaranteed quality workmanship and competitive pricing.</p>
    </div>`).join('');

  const certBadges = certs.length > 0
    ? certs.map(c => `<span class="cert-badge">✓ ${c}</span>`).join('')
    : '';

  const phoneLink = phone ? `<a href="tel:${phone.replace(/\s/g,'')}">📞 ${phone}</a>` : '';
  const emailLink = email ? `<a href="mailto:${email}">✉️ ${email}</a>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${data.businessName} | ${data.trade} in ${area}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--p:${theme.primary};--pd:${theme.dark};--pm:${theme.mid};--pl:${theme.light};--pt:${theme.text}}
body{font-family:'Inter',system-ui,sans-serif;color:#1a202c;line-height:1.6;background:#fff}
a{color:inherit;text-decoration:none}
/* NAV */
nav{position:sticky;top:0;z-index:100;background:#fff;border-bottom:1px solid #e2e8f0;padding:0 5%;display:flex;align-items:center;justify-content:space-between;height:68px;box-shadow:0 1px 8px rgba(0,0,0,.06)}
.nav-brand{font-size:1.1rem;font-weight:800;color:var(--pd);letter-spacing:-.5px;max-width:220px;line-height:1.2}
.nav-links{display:flex;gap:2rem}
.nav-links a{font-size:.9rem;font-weight:500;color:#4a5568;transition:color .2s}
.nav-links a:hover{color:var(--p)}
.nav-cta{background:var(--p);color:#fff!important;padding:.5rem 1.25rem;border-radius:6px;font-size:.875rem;font-weight:600;transition:background .2s;white-space:nowrap}
.nav-cta:hover{background:var(--pd)}
@media(max-width:640px){.nav-links{display:none}}
/* HERO */
.hero{background:linear-gradient(135deg,var(--pd) 0%,var(--p) 60%,var(--pm) 100%);color:#fff;padding:90px 5% 80px;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;right:-100px;top:-100px;width:500px;height:500px;border-radius:50%;background:rgba(255,255,255,.05)}
.hero::after{content:'';position:absolute;left:-80px;bottom:-120px;width:400px;height:400px;border-radius:50%;background:rgba(0,0,0,.08)}
.hero-inner{max-width:700px;position:relative;z-index:1}
.hero-tag{display:inline-block;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;font-size:.8rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:.3rem .9rem;border-radius:20px;margin-bottom:1.2rem}
.hero h1{font-size:clamp(2rem,5vw,3.2rem);font-weight:900;line-height:1.1;letter-spacing:-1px;margin-bottom:1.1rem}
.hero-sub{font-size:1.15rem;opacity:.9;margin-bottom:2rem;font-weight:400;max-width:520px}
.hero-btns{display:flex;flex-wrap:wrap;gap:.85rem;margin-bottom:2rem}
.btn-primary{background:#fff;color:var(--pd)!important;font-weight:700;padding:.85rem 1.75rem;border-radius:8px;font-size:.95rem;transition:transform .15s,box-shadow .15s;box-shadow:0 4px 14px rgba(0,0,0,.15);display:inline-flex;align-items:center;gap:.4rem}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.2)}
.btn-secondary{background:rgba(255,255,255,.12);color:#fff!important;font-weight:600;padding:.85rem 1.75rem;border-radius:8px;font-size:.95rem;border:2px solid rgba(255,255,255,.4);transition:background .2s;display:inline-flex;align-items:center;gap:.4rem}
.btn-secondary:hover{background:rgba(255,255,255,.2)}
.hero-trust{display:flex;flex-wrap:wrap;gap:.6rem}
.trust-badge{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);color:rgba(255,255,255,.95);padding:.3rem .85rem;border-radius:20px;font-size:.8rem;font-weight:500}
/* SERVICES */
.services{padding:80px 5%;background:#fff}
.section-header{text-align:center;margin-bottom:3rem}
.section-tag{display:inline-block;background:var(--pl);color:var(--pt);font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:.35rem .9rem;border-radius:20px;margin-bottom:.85rem}
.section-header h2{font-size:clamp(1.8rem,4vw,2.5rem);font-weight:800;letter-spacing:-.5px;color:#1a202c}
.section-header p{color:#718096;margin-top:.5rem;font-size:1.05rem;max-width:500px;margin-left:auto;margin-right:auto}
.services-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.5rem;max-width:1100px;margin:0 auto}
.service-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:2rem 1.5rem;text-align:center;transition:box-shadow .2s,transform .2s;cursor:default}
.service-card:hover{box-shadow:0 8px 30px rgba(0,0,0,.1);transform:translateY(-4px)}
.service-icon{font-size:2.2rem;margin-bottom:1rem;display:block}
.service-card h3{font-size:1.05rem;font-weight:700;color:#1a202c;margin-bottom:.5rem}
.service-card p{font-size:.875rem;color:#718096;line-height:1.5}
/* ABOUT */
.about{padding:80px 5%;background:var(--pl)}
.about-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center}
@media(max-width:768px){.about-inner{grid-template-columns:1fr;gap:2rem}}
.about-text h2{font-size:clamp(1.7rem,4vw,2.3rem);font-weight:800;letter-spacing:-.5px;color:#1a202c;margin-bottom:1rem}
.about-text p{color:#4a5568;font-size:1rem;line-height:1.75;margin-bottom:1rem}
.cert-list{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem}
.cert-badge{background:var(--p);color:#fff;padding:.3rem .85rem;border-radius:20px;font-size:.8rem;font-weight:600}
.about-stats{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem}
.stat-card{background:#fff;border-radius:12px;padding:1.75rem 1.25rem;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.06)}
.stat-num{font-size:2.2rem;font-weight:900;color:var(--p);display:block;letter-spacing:-1px}
.stat-label{font-size:.8rem;color:#718096;font-weight:500;text-transform:uppercase;letter-spacing:.05em;margin-top:.2rem;display:block}
/* WHY */
.why{padding:80px 5%;background:#fff}
.why-grid{max-width:1000px;margin:2.5rem auto 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:2rem}
.why-item{text-align:center}
.why-icon{font-size:2rem;margin-bottom:.75rem;display:block}
.why-item h3{font-size:1rem;font-weight:700;color:#1a202c;margin-bottom:.4rem}
.why-item p{font-size:.875rem;color:#718096}
/* CONTACT */
.contact{padding:80px 5%;background:var(--pd);color:#fff}
.contact .section-header h2{color:#fff}
.contact .section-header p{color:rgba(255,255,255,.75)}
.contact-inner{max-width:900px;margin:2.5rem auto 0;display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:start}
@media(max-width:640px){.contact-inner{grid-template-columns:1fr}}
.contact-info h3{font-size:1.2rem;font-weight:700;margin-bottom:1.25rem;color:#fff}
.contact-item{display:flex;align-items:center;gap:.75rem;margin-bottom:.85rem;font-size:1rem}
.contact-item a{color:rgba(255,255,255,.9);transition:color .2s}
.contact-item a:hover{color:#fff}
.contact-form{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:2rem}
.form-group{margin-bottom:1rem}
.form-group label{display:block;font-size:.8rem;font-weight:600;color:rgba(255,255,255,.8);margin-bottom:.35rem;letter-spacing:.04em;text-transform:uppercase}
.form-group input,.form-group textarea{width:100%;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:.75rem 1rem;color:#fff;font-size:.95rem;font-family:inherit;resize:vertical;outline:none;transition:border-color .2s}
.form-group input::placeholder,.form-group textarea::placeholder{color:rgba(255,255,255,.45)}
.form-group input:focus,.form-group textarea:focus{border-color:rgba(255,255,255,.6)}
.form-submit{background:#fff;color:var(--pd);border:none;padding:.85rem 2rem;border-radius:8px;font-size:.95rem;font-weight:700;cursor:pointer;width:100%;transition:opacity .2s;font-family:inherit}
.form-submit:hover{opacity:.9}
/* FOOTER */
footer{background:#0f172a;color:rgba(255,255,255,.6);padding:1.75rem 5%;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem;font-size:.85rem}
footer .footer-brand{color:#fff;font-weight:700;font-size:.95rem}
footer a{color:rgba(255,255,255,.6);transition:color .2s}
footer a:hover{color:#fff}
</style>
</head>
<body>

<nav>
  <div class="nav-brand">${data.businessName}</div>
  <div class="nav-links">
    <a href="#services">Services</a>
    <a href="#about">About</a>
    <a href="#contact">Contact</a>
  </div>
  ${phone ? `<a href="tel:${phone.replace(/\s/g,'')}" class="nav-cta">📞 Call Now</a>` : '<a href="#contact" class="nav-cta">Get a Quote</a>'}
</nav>

<section class="hero">
  <div class="hero-inner">
    <div class="hero-tag">${data.trade || 'Trade Services'} · ${area}</div>
    <h1>${headline}</h1>
    <p class="hero-sub">${ownerName ? `${ownerName} — ` : ''}${years ? `${years} years experience. ` : ''}Serving ${area} and surrounding areas.${extra ? ' ' + extra : ''}</p>
    <div class="hero-btns">
      ${phone ? `<a href="tel:${phone.replace(/\s/g,'')}" class="btn-primary">📞 Call ${phone}</a>` : ''}
      <a href="#contact" class="btn-secondary">Get a Free Quote →</a>
    </div>
    <div class="hero-trust">
      <span class="trust-badge">✓ Fully Insured</span>
      <span class="trust-badge">✓ Free Quotes</span>
      ${years ? `<span class="trust-badge">✓ ${years} Years Experience</span>` : ''}
      <span class="trust-badge">✓ No Call-Out Charge</span>
    </div>
  </div>
</section>

<section class="services" id="services">
  <div class="section-header">
    <div class="section-tag">What We Do</div>
    <h2>Our Services</h2>
    <p>Professional, reliable and fully insured across all our services.</p>
  </div>
  <div class="services-grid">
    ${serviceCards}
  </div>
</section>

<section class="about" id="about">
  <div class="about-inner">
    <div class="about-text">
      <div class="section-tag">About Us</div>
      <h2>Why ${data.businessName}?</h2>
      <p>${ownerName ? `${ownerName} and the team at ` : ''}${data.businessName} ${years ? `have been serving ${area} for over ${years} years` : `are based in ${area}`}. We're trusted by homeowners and businesses alike for quality workmanship and fair pricing.</p>
      <p>Every job — big or small — gets the same level of care and attention to detail. We always leave the site clean and the customer happy.</p>
      ${certBadges ? `<div class="cert-list">${certBadges}</div>` : ''}
    </div>
    <div class="about-stats">
      ${years ? `<div class="stat-card"><span class="stat-num">${years}</span><span class="stat-label">Years Experience</span></div>` : '<div class="stat-card"><span class="stat-num">★★★★★</span><span class="stat-label">5 Star Rated</span></div>'}
      <div class="stat-card"><span class="stat-num">100%</span><span class="stat-label">Satisfaction</span></div>
      <div class="stat-card"><span class="stat-num">Free</span><span class="stat-label">Quotes & Estimates</span></div>
      <div class="stat-card"><span class="stat-num">24/7</span><span class="stat-label">Emergency Callouts</span></div>
    </div>
  </div>
</section>

<section class="why">
  <div class="section-header">
    <div class="section-tag">Why Choose Us</div>
    <h2>The ${data.businessName} Promise</h2>
  </div>
  <div class="why-grid">
    <div class="why-item"><span class="why-icon">⚡</span><h3>Fast Response</h3><p>We get back to every enquiry the same day and can often attend the same week.</p></div>
    <div class="why-item"><span class="why-icon">💰</span><h3>Fair Pricing</h3><p>No hidden charges. Clear, upfront quotes before any work starts.</p></div>
    <div class="why-item"><span class="why-icon">🛡️</span><h3>Fully Insured</h3><p>Full public liability insurance on every job for your complete peace of mind.</p></div>
    <div class="why-item"><span class="why-icon">🏆</span><h3>Quality Work</h3><p>We stand behind everything we do. If you're not happy, we'll make it right.</p></div>
  </div>
</section>

<section class="contact" id="contact">
  <div class="section-header">
    <div class="section-tag" style="background:rgba(255,255,255,.15);color:#fff">Get In Touch</div>
    <h2>Contact Us</h2>
    <p>Get a free, no-obligation quote today.</p>
  </div>
  <div class="contact-inner">
    <div class="contact-info">
      <h3>Reach Us Directly</h3>
      ${phone ? `<div class="contact-item">${phoneLink}</div>` : ''}
      ${email ? `<div class="contact-item">${emailLink}</div>` : ''}
      <div class="contact-item">📍 Serving ${area} and surrounding areas</div>
      ${certBadges ? `<div class="cert-list" style="margin-top:1.5rem">${certBadges}</div>` : ''}
    </div>
    <form class="contact-form" onsubmit="return false">
      <div class="form-group">
        <label>Your Name</label>
        <input type="text" placeholder="John Murphy">
      </div>
      <div class="form-group">
        <label>Phone Number</label>
        <input type="tel" placeholder="087 000 0000">
      </div>
      <div class="form-group">
        <label>What Do You Need?</label>
        <textarea rows="3" placeholder="Describe the job..."></textarea>
      </div>
      <button class="form-submit">Send Enquiry →</button>
    </form>
  </div>
</section>

<footer>
  <span class="footer-brand">${data.businessName}</span>
  <span>${data.trade || 'Trade Services'} · ${area}</span>
  ${phone ? `<a href="tel:${phone.replace(/\s/g,'')}">${phone}</a>` : ''}
</footer>

</body>
</html>`;
};
