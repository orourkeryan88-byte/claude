import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TRADES = [
  'Plumber', 'Plumber / Heating', 'Electrician', 'Painter & Decorator',
  'Builder', 'Plasterer', 'Roofer', 'Carpenter', 'Carpenter / Builder',
  'Handyman', 'Handyman / Carpenter', 'Gardener / Landscaper',
  'Power Washing', 'Power Washing / Garden Maintenance', 'Glazier', 'Gas / Heating',
];

const COLOR_THEMES = [
  { id: 'blue',   label: 'Navy Blue',      color: '#1e40af', desc: 'Professional, trustworthy' },
  { id: 'green',  label: 'Forest Green',   color: '#166534', desc: 'Nature, growth, reliability' },
  { id: 'orange', label: 'Bold Orange',    color: '#c2410c', desc: 'Energy, confidence' },
  { id: 'slate',  label: 'Slate Grey',     color: '#334155', desc: 'Clean, modern, premium' },
  { id: 'purple', label: 'Deep Purple',    color: '#6d28d9', desc: 'Creative, distinctive' },
  { id: 'red',    label: 'Strong Red',     color: '#b91c1c', desc: 'Bold, urgent, standout' },
];

const STEPS = [
  { id: 'business',  label: 'Business',   icon: '🏢' },
  { id: 'contact',   label: 'Contact',    icon: '📞' },
  { id: 'services',  label: 'Services',   icon: '🔧' },
  { id: 'design',    label: 'Design',     icon: '🎨' },
  { id: 'generate',  label: 'Generate',   icon: '✨' },
];

const INITIAL = {
  businessName: '', ownerName: '', trade: '', area: '',
  phone: '', email: '', yearsExperience: '', certifications: '',
  services: [], tagline: '', extra: '', colorTheme: 'blue',
};

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: '#374151', marginBottom: '.35rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: '.75rem', color: '#9ca3af', marginTop: '.3rem' }}>{hint}</div>}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '.75rem 1rem', border: '1.5px solid #e2e8f0',
  borderRadius: 8, fontSize: '.95rem', color: '#1a202c', outline: 'none',
  transition: 'border-color .2s', background: '#fff',
};

export default function CreateSite() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(INITIAL);
  const [generating, setGenerating] = useState(false);
  const [serviceInput, setServiceInput] = useState('');
  const navigate = useNavigate();

  const set = (key, val) => setData(d => ({ ...d, [key]: val }));

  const addService = () => {
    const s = serviceInput.trim();
    if (s && !data.services.includes(s)) set('services', [...data.services, s]);
    setServiceInput('');
  };

  const removeService = (s) => set('services', data.services.filter(x => x !== s));

  const canAdvance = () => {
    if (step === 0) return data.businessName.trim() && data.trade;
    if (step === 1) return data.area.trim() && (data.phone.trim() || data.email.trim());
    return true;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const { id } = await res.json();
      navigate(`/edit/${id}`);
    } catch (e) {
      alert('Something went wrong. Please try again.');
      setGenerating(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '0 5%', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          ← Back
        </button>
        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e40af' }}>Create New Website</div>
        <div style={{ fontSize: '.85rem', color: '#94a3b8' }}>Step {step + 1} of {STEPS.length}</div>
      </div>

      {/* Progress */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9', padding: '1rem 5%' }}>
        <div style={{ display: 'flex', gap: '.5rem', maxWidth: 600, margin: '0 auto' }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', margin: '0 auto .3rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i < step ? '#16a34a' : i === step ? '#1e40af' : '#f1f5f9',
                color: i <= step ? '#fff' : '#94a3b8',
                fontSize: i < step ? '1rem' : '.85rem',
                fontWeight: 700, transition: 'all .3s',
              }}>
                {i < step ? '✓' : s.icon}
              </div>
              <div style={{ fontSize: '.68rem', fontWeight: 600, color: i === step ? '#1e40af' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2.5rem 5%' }}>
        <div style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,.06)', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #1e40af)', padding: '1.75rem 2rem', color: '#fff' }}>
            <div style={{ fontSize: 28, marginBottom: '.5rem' }}>{STEPS[step].icon}</div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
              {step === 0 && 'Tell us about the business'}
              {step === 1 && 'Contact details'}
              {step === 2 && 'Services & credentials'}
              {step === 3 && 'Choose a design style'}
              {step === 4 && 'Ready to generate'}
            </h2>
            <p style={{ opacity: .8, fontSize: '.875rem', marginTop: '.25rem' }}>
              {step === 0 && 'Start with the basics — company name and type of trade.'}
              {step === 1 && 'How can customers reach this business?'}
              {step === 2 && 'What services do they offer? Any certifications?'}
              {step === 3 && 'Pick a colour theme that fits the brand.'}
              {step === 4 && "We'll build a professional website based on your answers."}
            </p>
          </div>

          <div style={{ padding: '2rem' }}>
            {/* STEP 0: Business */}
            {step === 0 && (
              <>
                <Field label="Business Name *">
                  <input
                    style={inputStyle}
                    placeholder="e.g. Tyrrell Heating & Plumbing"
                    value={data.businessName}
                    onChange={e => set('businessName', e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#1e40af'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </Field>
                <Field label="Owner / Contact Name" hint="Optional — used in the About section">
                  <input
                    style={inputStyle}
                    placeholder="e.g. John Tyrrell"
                    value={data.ownerName}
                    onChange={e => set('ownerName', e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#1e40af'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </Field>
                <Field label="Trade / Service *">
                  <select
                    style={{ ...inputStyle, appearance: 'auto' }}
                    value={data.trade}
                    onChange={e => set('trade', e.target.value)}
                  >
                    <option value="">Select a trade...</option>
                    {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Years in Business" hint="Optional — adds credibility to the site">
                  <input
                    style={inputStyle}
                    placeholder="e.g. 15"
                    value={data.yearsExperience}
                    onChange={e => set('yearsExperience', e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#1e40af'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </Field>
              </>
            )}

            {/* STEP 1: Contact */}
            {step === 1 && (
              <>
                <Field label="Area / Location Covered *" hint="e.g. Dalkey, South Dublin, Dun Laoghaire">
                  <input
                    style={inputStyle}
                    placeholder="e.g. Dalkey, Co. Dublin"
                    value={data.area}
                    onChange={e => set('area', e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#1e40af'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </Field>
                <Field label="Phone Number *">
                  <input
                    style={inputStyle}
                    placeholder="e.g. 087 708 5922"
                    value={data.phone}
                    onChange={e => set('phone', e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#1e40af'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </Field>
                <Field label="Email Address">
                  <input
                    style={inputStyle}
                    placeholder="e.g. john@tyrrell.ie"
                    value={data.email}
                    onChange={e => set('email', e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#1e40af'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </Field>
              </>
            )}

            {/* STEP 2: Services */}
            {step === 2 && (
              <>
                <Field label="Certifications / Registrations" hint="e.g. RECI Registered, Gas Safe, RGI, Fully Insured">
                  <input
                    style={inputStyle}
                    placeholder="e.g. RECI Registered, RGI Approved"
                    value={data.certifications}
                    onChange={e => set('certifications', e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#1e40af'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </Field>
                <Field label="Specific Services" hint="Leave blank to auto-generate based on trade. Or add custom ones:">
                  <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.75rem' }}>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder="e.g. Emergency Boiler Repair"
                      value={serviceInput}
                      onChange={e => setServiceInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addService()}
                      onFocus={e => e.target.style.borderColor = '#1e40af'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <button
                      onClick={addService}
                      style={{ padding: '.75rem 1rem', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '.85rem' }}
                    >Add</button>
                  </div>
                  {data.services.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
                      {data.services.map(s => (
                        <span key={s} style={{ background: '#dbeafe', color: '#1e40af', padding: '.3rem .75rem', borderRadius: 20, fontSize: '.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                          {s}
                          <button onClick={() => removeService(s)} style={{ background: 'none', border: 'none', color: '#1e40af', fontWeight: 700, fontSize: '.9rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </Field>
                <Field label="Tagline / Headline" hint="Optional — a short phrase for the hero section">
                  <input
                    style={inputStyle}
                    placeholder="e.g. Reliable Plumbing in Dalkey Since 2005"
                    value={data.tagline}
                    onChange={e => set('tagline', e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#1e40af'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </Field>
                <Field label="Anything else to highlight?">
                  <textarea
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                    placeholder="e.g. Same-day service, family-run business, free call-out..."
                    value={data.extra}
                    onChange={e => set('extra', e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#1e40af'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </Field>
              </>
            )}

            {/* STEP 3: Design */}
            {step === 3 && (
              <div>
                <p style={{ fontSize: '.9rem', color: '#64748b', marginBottom: '1.25rem' }}>
                  Choose a colour theme. This sets the primary colour across the whole website.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                  {COLOR_THEMES.map(t => (
                    <div
                      key={t.id}
                      onClick={() => set('colorTheme', t.id)}
                      style={{
                        border: data.colorTheme === t.id ? `2.5px solid ${t.color}` : '2px solid #e2e8f0',
                        borderRadius: 10, padding: '1rem', cursor: 'pointer',
                        background: data.colorTheme === t.id ? t.color + '10' : '#fff',
                        transition: 'all .15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.3rem' }}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, background: t.color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 700, fontSize: '.88rem', color: '#1a202c' }}>{t.label}</span>
                        {data.colorTheme === t.id && <span style={{ marginLeft: 'auto', color: t.color }}>✓</span>}
                      </div>
                      <div style={{ fontSize: '.75rem', color: '#94a3b8', paddingLeft: 26 }}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: Review & Generate */}
            {step === 4 && (
              <div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.25rem', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.85rem' }}>Summary</h3>
                  {[
                    { label: 'Business', value: data.businessName },
                    { label: 'Trade', value: data.trade },
                    { label: 'Owner', value: data.ownerName || '—' },
                    { label: 'Area', value: data.area },
                    { label: 'Phone', value: data.phone || '—' },
                    { label: 'Email', value: data.email || '—' },
                    { label: 'Experience', value: data.yearsExperience ? `${data.yearsExperience} years` : '—' },
                    { label: 'Certifications', value: data.certifications || 'None added' },
                    { label: 'Services', value: data.services.length > 0 ? data.services.join(', ') : 'Auto (based on trade)' },
                    { label: 'Colour Theme', value: COLOR_THEMES.find(t => t.id === data.colorTheme)?.label || data.colorTheme },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', gap: '1rem', padding: '.4rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '.875rem' }}>
                      <span style={{ color: '#94a3b8', fontWeight: 500, minWidth: 100 }}>{row.label}</span>
                      <span style={{ color: '#1a202c', fontWeight: 500 }}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '.875rem', color: '#64748b', textAlign: 'center' }}>
                  Your professional website will be generated instantly. You can edit everything after.
                </p>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '1.75rem' }}>
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  disabled={generating}
                  style={{
                    flex: 1, padding: '.85rem', background: '#f1f5f9', color: '#334155',
                    border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: '.95rem', fontWeight: 600
                  }}
                >← Back</button>
              )}
              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canAdvance()}
                  style={{
                    flex: 1, padding: '.85rem',
                    background: canAdvance() ? 'linear-gradient(135deg, #1e3a8a, #1e40af)' : '#e2e8f0',
                    color: canAdvance() ? '#fff' : '#94a3b8',
                    border: 'none', borderRadius: 9, fontSize: '.95rem', fontWeight: 700,
                    boxShadow: canAdvance() ? '0 4px 14px rgba(30,64,175,.3)' : 'none',
                  }}
                >
                  Continue →
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  style={{
                    flex: 1, padding: '.85rem',
                    background: generating ? '#e2e8f0' : 'linear-gradient(135deg, #166534, #16a34a)',
                    color: generating ? '#94a3b8' : '#fff',
                    border: 'none', borderRadius: 9, fontSize: '.95rem', fontWeight: 700,
                    boxShadow: generating ? 'none' : '0 4px 14px rgba(22,163,74,.35)',
                  }}
                >
                  {generating ? '⏳ Building your site...' : '✨ Generate Website'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
