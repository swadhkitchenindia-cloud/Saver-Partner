import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../components/AuthContext';
import RestaurantNav from '../../components/RestaurantNav';

const CATEGORIES = ['Bakery items', 'Meals / Rice', 'Snacks', 'Sweets & Desserts', 'Beverages', 'Breads', 'Biriyani', 'Seafood'];
const EMOJIS = { 'Bakery items': '🥐', 'Meals / Rice': '🍛', 'Snacks': '🥨', 'Sweets & Desserts': '🎂', 'Beverages': '☕', 'Breads': '🍞', 'Biriyani': '🍚', 'Seafood': '🦐' };

export default function RestaurantPost() {
  const [form, setForm] = useState({
    name: '', description: '', category: 'Bakery items',
    originalPrice: '', discount: '', quantity: '', pickupBy: '20:00'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { user, profile } = useAuth();
  const nav = useNavigate();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const discountedPrice = form.originalPrice && form.discount
    ? Math.round(+form.originalPrice * (1 - +form.discount / 100))
    : null;

  const submit = async (e) => {
    e.preventDefault();
    if (!user || !profile) return;
    setError('');

    // Validate
    if (!form.name.trim()) return setError('Please enter an item name');
    if (!form.originalPrice || +form.originalPrice < 1) return setError('Please enter a valid price');
    if (!form.discount || +form.discount < 10 || +form.discount > 80) return setError('Discount must be between 10% and 80%');
    if (!form.quantity || +form.quantity < 1) return setError('Please enter quantity');

    setLoading(true);
    try {
      const [h, m] = form.pickupBy.split(':');
      const pickupTime = new Date();
      pickupTime.setHours(+h, +m, 0, 0);

      // If pickup time already passed today, set for tomorrow
      if (pickupTime.getTime() < Date.now()) {
        pickupTime.setDate(pickupTime.getDate() + 1);
      }

      const docRef = await addDoc(collection(db, 'listings'), {
        restaurantId: user.uid,
        restaurantName: profile.businessName || '',
        restaurantLocation: profile.location || '',
        restaurantAddress: profile.address || '',
        restaurantPhone: profile.phone || '',
        lat: profile.lat || null,
        lng: profile.lng || null,
        restaurantImage: profile.imageUrl || '',
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        emoji: EMOJIS[form.category] || '🍽️',
        originalPrice: +form.originalPrice,
        discount: +form.discount,
        discountedPrice: discountedPrice,
        quantity: +form.quantity,
        quantityLeft: +form.quantity,
        pickupBy: form.pickupBy,
        pickupTimestamp: pickupTime.getTime(),
        status: 'active',
        createdAt: Date.now(),
        createdAtServer: serverTimestamp(),
      });

      // Confirm write succeeded
      if (docRef.id) {
        setSuccess(true);
        // Reset form
        setForm({ name: '', description: '', category: 'Bakery items', originalPrice: '', discount: '', quantity: '', pickupBy: '20:00' });
      }
    } catch (e) {
      console.error('Post listing error:', e);
      setError('Failed to post listing: ' + (e.message || 'Please check your connection and try again.'));
    }
    setLoading(false);
  };

  if (success) return (
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 64, animation: 'popIn 0.5s ease' }}>✅</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Item listed!</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Your item is now live on Saver.<br />Customers can see and reserve it immediately.
        </p>
        <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 8 }}>
          <button className="btn-green" onClick={() => nav('/dashboard')}>View dashboard</button>
          <button className="btn-outline" onClick={() => setSuccess(false)}>Post another</button>
        </div>
      </div>
      <style>{`@keyframes popIn { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }`}</style>
    </div>
  );

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Post surplus item</div>
          <div className="topbar-sub">Goes live immediately on Saver</div>
        </div>
      </div>

      <div className="content">
        {error && (
          <div className="error-msg" style={{ marginBottom: 14 }}>⚠️ {error}</div>
        )}

        <form onSubmit={submit}>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' }}>Item details</div>
            <div className="field">
              <label>Item name *</label>
              <input type="text" value={form.name} onChange={set('name')}
                placeholder="e.g. Banana Cake, Veg Puffs, Chicken Biryani..." required />
            </div>
            <div className="field">
              <label>Description (optional)</label>
              <textarea value={form.description} onChange={set('description')}
                placeholder="Brief description for customers..." />
            </div>
            <div className="field">
              <label>Category *</label>
              <select value={form.category} onChange={set('category')}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' }}>Pricing & availability</div>
            <div className="field-row">
              <div className="field">
                <label>Original price (₹) *</label>
                <input type="number" value={form.originalPrice} onChange={set('originalPrice')}
                  placeholder="200" min="1" required />
              </div>
              <div className="field">
                <label>Discount % *</label>
                <input type="number" value={form.discount} onChange={set('discount')}
                  placeholder="40" min="10" max="80" required />
              </div>
            </div>

            {discountedPrice !== null && (
              <div className="price-preview">
                <div>
                  <div className="pp-label">Customer pays</div>
                  <div style={{ fontSize: 12, color: 'var(--amber-dark)', marginTop: 2 }}>
                    You save ₹{+form.originalPrice - discountedPrice} from waste
                  </div>
                </div>
                <span className="pp-val">₹{discountedPrice}</span>
              </div>
            )}

            <div className="field-row" style={{ marginTop: 12 }}>
              <div className="field">
                <label>Quantity *</label>
                <input type="number" value={form.quantity} onChange={set('quantity')}
                  placeholder="5" min="1" required />
              </div>
              <div className="field">
                <label>Pickup by *</label>
                <input type="time" value={form.pickupBy} onChange={set('pickupBy')} required />
              </div>
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Posting to Saver...
              </span>
            ) : 'List item now 🚀'}
          </button>
          <button type="button" className="btn-outline" style={{ marginTop: 10 }}
            onClick={() => nav('/dashboard')}>
            ← Back to dashboard
          </button>
        </form>
      </div>
      <RestaurantNav />
    </>
  );
}
