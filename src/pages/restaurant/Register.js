import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import { auth } from '../../firebase/config';
// firestore import removed — writes handled in AuthContext
import { signOut } from 'firebase/auth';
import { getUserLocation, reverseGeocode, forwardGeocode } from '../../firebase/location';

const BUSINESS_TYPES = ['Restaurant', 'Bakery', 'Cafe', 'Hotel', 'Sweet Shop', 'Cloud Kitchen', 'Food Stall', 'Other'];

export default function RestaurantRegister() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    businessName: '', businessType: 'Restaurant',
    location: '', address: '', phone: '',
    email: '', password: '',
    fssaiNumber: '', fssaiExpiry: '',
    ownerName: '', ownerPhone: '', description: '',
  });
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [locState, setLocState] = useState('idle'); // idle | detecting | manual | found
  const [locQuery, setLocQuery] = useState('');
  const [locResults, setLocResults] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const { registerRestaurant } = useAuth();
  const nav = useNavigate();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Detect GPS location of the shop
  const detectShopLocation = async () => {
    setLocState('detecting');
    setErr('');
    try {
      const c = await getUserLocation();
      const label = await reverseGeocode(c.lat, c.lng);
      setCoords(c);
      setForm(f => ({ ...f, location: label }));
      setLocState('found');
    } catch (e) {
      setLocState('manual');
      if (e.code === 1) setErr('Location permission denied. Please enter your address manually.');
      else setErr('Could not detect location. Please enter manually.');
    }
  };

  // Manual location search
  const searchLocation = async (val) => {
    setLocQuery(val);
    if (val.length < 3) { setLocResults([]); return; }
    const results = await forwardGeocode(val);
    setLocResults(results);
  };

  const pickLocation = (r) => {
    setCoords({ lat: r.lat, lng: r.lng });
    setForm(f => ({ ...f, location: r.label }));
    setLocState('found');
    setLocQuery('');
    setLocResults([]);
  };

  const validateFSSAI = (num) => /^\d{14}$/.test(num.replace(/\s/g, ''));

  const submitStep1 = (e) => {
    e.preventDefault();
    if (!form.businessName || !form.address || !form.phone || !form.email || !form.password)
      return setErr('Please fill all required fields');
    if (!coords)
      return setErr('Please set your shop location — this is required for customers to find you');
    if (form.password.length < 6)
      return setErr('Password must be at least 6 characters');
    setErr('');
    setStep(2);
  };

  const submitStep2 = async (e) => {
    e.preventDefault();
    if (!form.fssaiNumber) return setErr('FSSAI license number is mandatory');
    if (!validateFSSAI(form.fssaiNumber)) return setErr('FSSAI number must be exactly 14 digits');
    if (!form.fssaiExpiry) return setErr('FSSAI expiry date is required');
    if (!form.ownerName || !form.ownerPhone) return setErr('Owner name and phone are required');
    setErr('');
    setLoading(true);
    try {
      const normalizedEmail = (form.email || '').trim().toLowerCase();

      // Build the complete data object BEFORE creating the account
      const fullData = {
        role: 'restaurant',
        businessName: form.businessName,
        businessType: form.businessType,
        location: form.location,
        address: form.address,
        phone: form.phone,
        ownerName: form.ownerName,
        ownerPhone: form.ownerPhone,
        fssaiNumber: form.fssaiNumber.replace(/\s/g, ''),
        fssaiExpiry: form.fssaiExpiry,
        description: form.description || '',
        lat: coords?.lat || null,
        lng: coords?.lng || null,
        verificationStatus: 'pending',
        canList: false,
      };

      // Single atomic call — creates auth user AND writes all Firestore data together
      await registerRestaurant(normalizedEmail, form.password, fullData);

      // Only sign out AFTER confirmed write — then show success screen
      await signOut(auth);
      setStep(3);
    } catch (e) {
      console.error('Registration error:', e?.code, e);
      const code = e?.code || '';
      if (code === 'auth/email-already-in-use') {
        setErr('This email is already registered. Please sign in instead.');
      } else if (code === 'auth/operation-not-allowed') {
        setErr('Email/password sign-in is disabled in Firebase Auth for this project.');
      } else if (code === 'auth/invalid-email') {
        setErr('Please enter a valid email address.');
      } else if (code === 'auth/weak-password') {
        setErr('Password is too weak. Please use at least 6 characters.');
      } else if (code === 'auth/network-request-failed') {
        setErr('Network error. Please check your connection and try again.');
      } else {
        setErr('Registration failed' + (code ? ` (${code})` : '') + ': ' + (e?.message || 'Please try again.'));
      }
    }
    setLoading(false);
  };

  if (step === 3) return (
    <div className="login-page" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Application submitted!</h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24, maxWidth: 300 }}>
        Thank you, <b>{form.businessName}</b>! Our team will verify your FSSAI license and contact you.
      </p>
      <div style={{ background: 'var(--green-bg)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, textAlign: 'left', width: '100%' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>What happens next</div>
        {['Our team reviews your FSSAI license', 'We may visit your shop at ' + form.address, 'You\'ll receive a call on ' + form.ownerPhone, 'Once approved — start listing!'].map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 13, color: 'var(--green-dark)' }}>
            <span style={{ fontWeight: 800, minWidth: 18 }}>{i + 1}.</span><span>{s}</span>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', width: '100%', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        📞 We'll call <b>{form.ownerPhone}</b><br />
        📧 <b>{form.email}</b><br />
        ⏱️ 2-3 business days
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        Already approved? <span style={{ color: 'var(--green)', cursor: 'pointer', fontWeight: 700 }} onClick={() => nav('/login')}>Sign in →</span>
      </div>
    </div>
  );

  return (
    <div className="login-page" style={{ paddingTop: 20, paddingBottom: 40 }}>
      <div className="login-logo">
        <div className="login-logo-icon">🍊</div>
        <h1>Join Saver</h1>
        <p>Step {step} of 2 — {step === 1 ? 'Business details' : 'License & verification'}</p>
      </div>

      <div style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2 }}>
        <div style={{ width: `${step * 50}%`, height: '100%', background: 'var(--green)', borderRadius: 2, transition: 'width 0.3s ease' }} />
      </div>

      {step === 1 && (
        <form className="login-card" onSubmit={submitStep1} style={{ width: '100%' }}>
          <h2>Business details</h2>
          <p>Tell us about your establishment</p>
          {err && <div className="error-msg">{err}</div>}

          <div className="field"><label>Business name *</label><input value={form.businessName} onChange={set('businessName')} placeholder="Abad Bakery" required /></div>
          <div className="field">
            <label>Business type *</label>
            <select value={form.businessType} onChange={set('businessType')}>
              {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {/* Shop location with GPS */}
          <div className="field">
            <label>Shop location * (GPS required)</label>
            {locState === 'idle' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={detectShopLocation} style={{ flex: 1, background: 'var(--green)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  📍 Use current location
                </button>
                <button type="button" onClick={() => setLocState('manual')} style={{ flex: 1, background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '11px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✏️ Enter manually
                </button>
              </div>
            )}
            {locState === 'detecting' && (
              <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
                📡 Detecting your location...
              </div>
            )}
            {locState === 'found' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, background: 'var(--green-bg)', borderRadius: 'var(--radius-sm)', padding: '11px 13px', fontSize: 13, color: 'var(--green-dark)', fontWeight: 600 }}>
                  ✅ {form.location}
                  <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>GPS: {coords?.lat?.toFixed(4)}, {coords?.lng?.toFixed(4)}</div>
                </div>
                <button type="button" onClick={() => { setLocState('idle'); setCoords(null); setForm(f => ({ ...f, location: '' })); }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
                  Change
                </button>
              </div>
            )}
            {locState === 'manual' && (
              <div style={{ position: 'relative' }}>
                <input value={locQuery} onChange={e => searchLocation(e.target.value)} placeholder="Type your area, city..." autoFocus style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--green)', borderRadius: 'var(--radius-sm)', padding: '11px 13px', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
                {locResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: '0 0 10px 10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50, border: '1px solid var(--border-light)', maxHeight: 180, overflowY: 'auto' }}>
                    {locResults.map((r, i) => (
                      <div key={i} onClick={() => pickLocation(r)} style={{ padding: '11px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 8 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#E8F5F1'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                        📍 {r.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="field"><label>Full address *</label><textarea value={form.address} onChange={set('address')} placeholder="Shop no, Street, Area, City, PIN code" style={{ height: 70 }} required /></div>
          <div className="field"><label>Business phone *</label><input type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" required /></div>
          <div className="field"><label>Email *</label><input type="email" value={form.email} onChange={set('email')} placeholder="bakery@example.com" required /></div>
          <div className="field"><label>Password *</label><input type="password" value={form.password} onChange={set('password')} placeholder="Min. 6 characters" minLength={6} required /></div>

          <button className="btn-green" type="submit">Next: License details →</button>
          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
            Already registered? <span style={{ color: 'var(--green)', cursor: 'pointer', fontWeight: 700 }} onClick={() => nav('/login')}>Sign in</span>
          </div>
        </form>
      )}

      {step === 2 && (
        <form className="login-card" onSubmit={submitStep2} style={{ width: '100%' }}>
          <h2>License & verification</h2>
          <p>Required to list food on Saver</p>
          {err && <div className="error-msg">{err}</div>}
          <div className="alert-warn" style={{ marginBottom: 14 }}>⚠️ FSSAI license is mandatory. Our team verifies before activation.</div>
          <div className="field"><label>FSSAI license number * (14 digits)</label><input value={form.fssaiNumber} onChange={set('fssaiNumber')} placeholder="10014052000123" maxLength={14} required /></div>
          <div className="field"><label>FSSAI expiry date *</label><input type="date" value={form.fssaiExpiry} onChange={set('fssaiExpiry')} required /></div>
          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0 14px' }} />
          <div className="field"><label>Owner / Manager name *</label><input value={form.ownerName} onChange={set('ownerName')} placeholder="Your full name" required /></div>
          <div className="field"><label>Owner phone * (we'll call this)</label><input type="tel" value={form.ownerPhone} onChange={set('ownerPhone')} placeholder="+91 98765 43210" required /></div>
          <div className="field"><label>About your business (optional)</label><textarea value={form.description} onChange={set('description')} placeholder="e.g. 20-year old bakery specializing in Kerala traditional sweets..." style={{ height: 70 }} /></div>
          <div style={{ background: 'var(--green-bg)', borderRadius: 10, padding: '10px 13px', marginBottom: 14, fontSize: 12, color: 'var(--green-dark)', lineHeight: 1.6 }}>
            By submitting you confirm all information is accurate and your FSSAI license is valid.
          </div>
          <button className="btn-green" type="submit" disabled={loading} style={{ position: 'relative' }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
                Submitting your application...
              </span>
            ) : 'Submit for verification ✓'}
          </button>
          {loading && (
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
              Please wait — saving your details securely...
            </div>
          )}
          <button type="button" className="btn-outline" style={{ marginTop: 10 }} onClick={() => setStep(1)}>← Back</button>
        </form>
      )}
    </div>
  );
}
