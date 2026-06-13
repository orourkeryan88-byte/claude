import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TRADE_COLORS = {
  'Plumber': '#1e40af', 'Plumber / Heating': '#1e40af',
  'Electrician': '#854d0e', 'Painter & Decorator': '#6d28d9',
  'Builder': '#166534', 'Plasterer': '#0e7490',
  'Roofer': '#9a3412', 'Carpenter': '#7c2d12',
  'Handyman': '#374151', 'Gardener / Landscaper': '#166534',
  'Power Washing': '#0c4a6e', 'Glazier': '#1e3a8a',
};

const TRADE_EMOJI = {
  'Plumber': '🔧', 'Plumber / Heating': '🔥', 'Electrician': '⚡',
  'Painter & Decorator': '🎨', 'Builder': '🏗️', 'Plasterer': '🪣',
  'Roofer': '🏠', 'Carpenter': '🪚', 'Handyman': '🔨',
  'Gardener / Landscaper': '🌿', 'Power Washing': '💧', 'Glazier': '🪟',
};

function SiteCard({ site, onDelete }) {
  const navigate = useNavigate();
  const color = TRADE_COLORS[site.trade] || '#334155';
  const emoji = TRADE_EMOJI[site.trade] || '🏢';

  return (
    <div style={{
      background: '#fff', borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,.07)', border: '1px solid #e2e8f0',
      transition: 'box-shadow .2s, transform .2s',
      cursor: 'pointer',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,.12)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.07)'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ background: color, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42 }}>
        {emoji}
      </div>
      <div style={{ padding: '1.25rem' }}>
        <div style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#94a3b8', marginBottom: '.25rem' }}>
          {site.trade}
        </div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1a202c', marginBottom: '.5rem', lineHeight: 1.3 }}>
          {site.name}
        </h3>
        <div style={{ fontSize: '.78rem', color: '#94a3b8', marginBottom: '1.1rem' }}>
          Created {new Date(site.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button
            onClick={() => window.open(`/preview/${site.id}`, '_blank')}
            style={{
              flex: 1, padding: '.55rem', background: color, color: '#fff',
              border: 'none', borderRadius: 7, fontSize: '.8rem', fontWeight: 600
            }}
          >👁 Preview</button>
          <button
            onClick={() => navigate(`/edit/${site.id}`)}
            style={{
              flex: 1, padding: '.55rem', background: '#f1f5f9', color: '#334155',
              border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '.8rem', fontWeight: 600
            }}
          >✏️ Edit</button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(site.id); }}
            style={{
              padding: '.55rem .7rem', background: '#fff', color: '#ef4444',
              border: '1px solid #fecaca', borderRadius: 7, fontSize: '.85rem'
            }}
          >🗑</button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/sites')
      .then(r => r.json())
      .then(data => { setSites(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this website?')) return;
    await fetch(`/api/sites/${id}`, { method: 'DELETE' });
    setSites(s => s.filter(x => x.id !== id));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '0 5%', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 8px rgba(0,0,0,.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <div style={{
            width: 34, height: 34, background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#fff', fontWeight: 800
          }}>R</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1a202c', lineHeight: 1 }}>RELIER</div>
            <div style={{ fontSize: '.7rem', color: '#94a3b8', fontWeight: 500 }}>Website Builder</div>
          </div>
        </div>
        <button
          onClick={() => navigate('/create')}
          style={{
            background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: '#fff',
            border: 'none', borderRadius: 9, padding: '.6rem 1.3rem',
            fontSize: '.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '.45rem',
            boxShadow: '0 4px 14px rgba(59,130,246,.35)'
          }}
        >
          + Create New Website
        </button>
      </div>

      <div style={{ padding: '2.5rem 5%' }}>
        {/* Stats bar */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Websites', value: sites.length, color: '#1e40af' },
            { label: 'Ready to Preview', value: sites.length, color: '#166534' },
            { label: 'Southline Agency', value: '✓ Active', color: '#6d28d9' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
              padding: '1rem 1.5rem', display: 'flex', gap: '.75rem', alignItems: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '.8rem', color: '#94a3b8', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a202c' }}>Your Websites</h1>
          {sites.length > 0 && (
            <span style={{ fontSize: '.85rem', color: '#94a3b8' }}>{sites.length} site{sites.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>Loading...</div>
        ) : sites.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '5rem 2rem',
            background: '#fff', borderRadius: 16, border: '2px dashed #e2e8f0'
          }}>
            <div style={{ fontSize: 52, marginBottom: '1rem' }}>🏗️</div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1a202c', marginBottom: '.5rem' }}>
              No websites yet
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
              Create your first tradesman website in under 2 minutes.
            </p>
            <button
              onClick={() => navigate('/create')}
              style={{
                background: '#1e40af', color: '#fff', border: 'none',
                borderRadius: 9, padding: '.75rem 1.75rem', fontSize: '.95rem', fontWeight: 700
              }}
            >
              + Create First Website
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {sites.map(site => (
              <SiteCard key={site.id} site={site} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
