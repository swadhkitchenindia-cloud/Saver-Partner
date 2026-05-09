import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';

export default function RestaurantLogin() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginRestaurant } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      await loginRestaurant(email, pass);
      nav('/dashboard');
    } catch {
      setErr('Invalid email or password. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg, var(--green-dark) 0%, var(--green) 100%)', padding: '48px 24px 36px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>🍊</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'white', letterSpacing: '-0.03em' }}>Saver Partner</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>
          Restaurant & Bakery Dashboard
        </div>
      </div>

      <div style={{ flex: 1, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <form onSubmit={submit}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Welcome back</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>Sign in to manage your surplus listings</div>
          {err && <div className="error-msg">{err}</div>}
          <div className="field">
            <label>Business email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="bakery@example.com" required autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn-green" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        </form>

        <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
          New restaurant partner?{' '}
          <span style={{ color: 'var(--green)', cursor: 'pointer', fontWeight: 700 }} onClick={() => nav('/register')}>
            Apply to join →
          </span>
        </div>

        {/* Benefits */}
        <div style={{ background: 'var(--green-bg)', borderRadius: 'var(--radius)', padding: '16px 18px', marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Why join Saver?</div>
          {[
            ['💰', 'Earn revenue from food that would go to waste'],
            ['📱', 'Customers find you on the Saver app'],
            ['⚡', 'List items in under 2 minutes'],
            ['📊', 'Track orders and payouts in real time'],
          ].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 13, color: 'var(--green-dark)', alignItems: 'center' }}>
              <span style={{ fontSize: 16 }}>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          Customer? Download the{' '}
          <a href="https://saver.in" style={{ color: 'var(--green)', fontWeight: 600 }}>Saver app →</a>
        </div>
      </div>
    </div>
  );
}
