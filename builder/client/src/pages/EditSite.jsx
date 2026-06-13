import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const TRADES = [
  'Plumber', 'Plumber / Heating', 'Electrician', 'Painter & Decorator',
  'Builder', 'Plasterer', 'Roofer', 'Carpenter', 'Carpenter / Builder',
  'Handyman', 'Handyman / Carpenter', 'Gardener / Landscaper',
  'Power Washing', 'Power Washing / Garden Maintenance', 'Glazier', 'Gas / Heating',
];

const COLOR_THEMES = [
  { id: 'blue',   label: 'Navy Blue',   color: '#1e40af' },
  { id: 'green',  label: 'Forest Green', color: '#166534' },
  { id: 'orange', label: 'Bold Orange', color: '#c2410c' },
  { id: 'slate',  label: 'Slate Grey',  color: '#334155' },
  { id: 'purple', label: 'Deep Purple', color: '#6d28d9' },
  { id: 'red',    label: 'Strong Red',  color: '#b91c1c' },
];

const inputSt = {
  width: '100%', padding: '.6rem .85rem', border: '1.5px solid #e2e8f0',
  borderRadius: 7, fontSize: '.875rem', color: '#1a202c', outline: 'none',
  background: '#fff', transition: 'border-color .2s',
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 700, color: '#64748b', marginBottom: '.3rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</label>
      {children}
    </div>
  );
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid #f1f5f9', marginBottom: '.25rem' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', padding: '.9rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontSize: '.82rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.06em' }}>{title}</span>
        <span style={{ color: '#94a3b8', fontSize: '.85rem' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: '0 1.25rem 1.25rem' }}>{children}</div>}
    </div>
  );
}

export default function EditSite() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [serviceInput, setServiceInput] = useState('');
  const debounceRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    fetch(`/api/sites/${id}`)
      .then(r => r.json())
      .then(site => {
        setData(site.data);
        setPreviewHtml(site.html);
      })
      .catch(() => navigate('/'));
  }, [id]);

  const updatePreview = useCallback(async (d) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(d),
        });
        const { html } = await res.json();
        setPreviewHtml(html);
      } catch {}
    }, 600);
  }, []);

  const set = (key, val) => {
    const next = { ...data, [key]: val };
    setData(next);
    updatePreview(next);
  };

  const addService = () => {
    const s = serviceInput.trim();
    if (!s || data.services.includes(s)) return;
    set('services', [...data.services, s]);
    setServiceInput('');
  };

  const removeService = (s) => set('services', data.services.filter(x => x !== s));

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/sites/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  const handleExport = () => {
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(data?.businessName || 'website').replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
  };

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: 36, marginBottom: '.75rem' }}>⏳</div>
        <div style={{ fontWeight: 600 }}>Loading editor...</div>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Top bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0', height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.25rem', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '.875rem', fontWeight: 500, cursor: 'pointer' }}>
            ← Dashboard
          </button>
          <div style={{ height: 20, width: 1, background: '#e2e8f0' }} />
          <span style={{ fontWeight: 700, fontSize: '.95rem', color: '#1a202c' }}>{data.businessName}</span>
        </div>
        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
          {saved && <span style={{ fontSize: '.8rem', color: '#16a34a', fontWeight: 600 }}>✓ Saved</span>}
          <button
            onClick={() => window.open(`/preview/${id}`, '_blank')}
            style={{ padding: '.5rem 1rem', background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '.82rem', fontWeight: 600 }}
          >👁 Full Preview</button>
          <button
            onClick={handleExport}
            style={{ padding: '.5rem 1rem', background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '.82rem', fontWeight: 600 }}
          >⬇ Export HTML</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '.5rem 1.25rem', background: saving ? '#e2e8f0' : '#1e40af',
              color: saving ? '#94a3b8' : '#fff', border: 'none', borderRadius: 7,
              fontSize: '.85rem', fontWeight: 700,
            }}
          >{saving ? 'Saving...' : '💾 Save'}</button>
        </div>
      </div>

      {/* Split editor */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel */}
        <div style={{ width: 310, flexShrink: 0, background: '#fff', borderRight: '1px solid #e2e8f0', overflowY: 'auto' }}>
          <Section title="Business Info">
            <Field label="Business Name">
              <input style={inputSt} value={data.businessName || ''} onChange={e => set('businessName', e.target.value)}
                onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </Field>
            <Field label="Owner Name">
              <input style={inputSt} value={data.ownerName || ''} onChange={e => set('ownerName', e.target.value)}
                onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </Field>
            <Field label="Trade">
              <select style={{ ...inputSt, appearance: 'auto' }} value={data.trade || ''} onChange={e => set('trade', e.target.value)}>
                {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Years Experience">
              <input style={inputSt} placeholder="e.g. 15" value={data.yearsExperience || ''} onChange={e => set('yearsExperience', e.target.value)}
                onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </Field>
          </Section>

          <Section title="Contact">
            <Field label="Area Covered">
              <input style={inputSt} value={data.area || ''} onChange={e => set('area', e.target.value)}
                onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </Field>
            <Field label="Phone">
              <input style={inputSt} value={data.phone || ''} onChange={e => set('phone', e.target.value)}
                onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </Field>
            <Field label="Email">
              <input style={inputSt} value={data.email || ''} onChange={e => set('email', e.target.value)}
                onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </Field>
          </Section>

          <Section title="Content">
            <Field label="Tagline / Headline">
              <textarea
                style={{ ...inputSt, resize: 'vertical', minHeight: 64 }}
                value={data.tagline || ''} onChange={e => set('tagline', e.target.value)}
                onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                placeholder="e.g. Trusted Plumbing in Dalkey"
              />
            </Field>
            <Field label="Certifications">
              <input style={inputSt} placeholder="RECI Registered, RGI Approved" value={data.certifications || ''}
                onChange={e => set('certifications', e.target.value)}
                onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </Field>
            <Field label="Extra Info">
              <textarea
                style={{ ...inputSt, resize: 'vertical', minHeight: 64 }}
                value={data.extra || ''} onChange={e => set('extra', e.target.value)}
                onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                placeholder="Same-day service, family run..."
              />
            </Field>
          </Section>

          <Section title="Services" defaultOpen={false}>
            <div style={{ display: 'flex', gap: '.4rem', marginBottom: '.6rem' }}>
              <input
                style={{ ...inputSt, flex: 1 }}
                placeholder="Add a service..."
                value={serviceInput}
                onChange={e => setServiceInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addService()}
                onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
              <button onClick={addService} style={{ padding: '.6rem .85rem', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: '.8rem' }}>+</button>
            </div>
            {data.services && data.services.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
                {data.services.map(s => (
                  <span key={s} style={{ background: '#dbeafe', color: '#1e40af', padding: '.25rem .65rem', borderRadius: 20, fontSize: '.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                    {s}
                    <button onClick={() => removeService(s)} style={{ background: 'none', border: 'none', color: '#1e40af', fontWeight: 700, cursor: 'pointer', lineHeight: 1, fontSize: '.9rem' }}>×</button>
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '.78rem', color: '#94a3b8' }}>Auto-generated from trade type</div>
            )}
          </Section>

          <Section title="Colour Theme" defaultOpen={false}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
              {COLOR_THEMES.map(t => (
                <div
                  key={t.id}
                  onClick={() => set('colorTheme', t.id)}
                  style={{
                    padding: '.6rem .75rem', borderRadius: 8, cursor: 'pointer',
                    border: data.colorTheme === t.id ? `2px solid ${t.color}` : '2px solid #e2e8f0',
                    background: data.colorTheme === t.id ? t.color + '15' : '#fff',
                    display: 'flex', alignItems: 'center', gap: '.5rem',
                  }}
                >
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: t.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '.75rem', fontWeight: 600, color: '#374151' }}>{t.label}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Right panel — live preview */}
        <div style={{ flex: 1, background: '#e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            background: '#f1f5f9', borderBottom: '1px solid #cbd5e1',
            padding: '.5rem 1rem', display: 'flex', alignItems: 'center', gap: '.5rem',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: '.35rem' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
            </div>
            <div style={{ flex: 1, background: '#fff', borderRadius: 5, padding: '.25rem .75rem', fontSize: '.78rem', color: '#94a3b8', fontWeight: 500 }}>
              Live Preview · {data.businessName}
            </div>
          </div>
          <iframe
            ref={iframeRef}
            srcDoc={previewHtml}
            style={{ flex: 1, border: 'none', width: '100%' }}
            title="Live Preview"
          />
        </div>
      </div>
    </div>
  );
}
