import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { useAuth } from '../../components/AuthContext';
import RestaurantNav from '../../components/RestaurantNav';

export default function RestaurantDashboard() {
  const { user, profile } = useAuth();
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const nav = useNavigate();

  // Real-time listings listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'listings'),
      where('restaurantId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q,
      (snap) => {
        setListings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setListingsLoading(false);
      },
      (err) => {
        console.error('Listings error:', err);
        setListingsLoading(false);
      }
    );
    return unsub;
  }, [user]);

  // Real-time orders listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'orders'), where('restaurantId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  const removeListing = async (id) => {
    if (!window.confirm('Remove this listing? Customers will no longer see it.')) return;
    try {
      await deleteDoc(doc(db, 'listings', id));
    } catch (e) {
      alert('Could not remove. Try again.');
    }
  };

  const todayRevenue = orders
    .filter(o => o.createdAt > Date.now() - 86400000 && o.status === 'collected')
    .reduce((s, o) => s + (o.paidPrice || 0), 0);

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activeListings = listings.filter(l => l.status === 'active');

  const statusPill = (l) => {
    if (l.status !== 'active') return <span className="pill pill-gray">Sold out</span>;
    if (l.quantityLeft <= 0) return <span className="pill pill-gray">Sold out</span>;
    if (l.quantityLeft <= 2) return <span className="pill pill-amber">{l.quantityLeft} left</span>;
    return <span className="pill pill-green">Live ●</span>;
  };

  const timeDisplay = (pickupBy) => {
    const [h, m] = pickupBy.split(':');
    const d = new Date(); d.setHours(+h, +m);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">{greeting} 👋</div>
          <div className="topbar-sub">{profile?.businessName || 'Your business'}</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--green)', border: '1px solid var(--border-light)', cursor: 'pointer' }}
          onClick={() => nav('/profile')}>
          {profile?.businessName?.charAt(0) || 'R'}
        </div>
      </div>

      <div className="content">
        {/* Verification pending banner */}
        {profile?.verificationStatus === 'pending' && (
          <div className="alert-warn" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20 }}>⏳</span>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 3 }}>Verification in progress</div>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                Our team is reviewing your FSSAI license. We'll call <b>{profile?.ownerPhone}</b> within 2-3 business days. You can explore the dashboard in the meantime.
              </div>
            </div>
          </div>
        )}

        {/* Pending orders alert */}
        {pendingOrders.length > 0 && (
          <div className="alert-info" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            onClick={() => nav('/orders')}>
            <span>🔔 {pendingOrders.length} order{pendingOrders.length > 1 ? 's' : ''} awaiting pickup</span>
            <span style={{ fontWeight: 700 }}>View →</span>
          </div>
        )}

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card accent">
            <div className="stat-val">₹{todayRevenue.toLocaleString()}</div>
            <div className="stat-lbl">Today's revenue</div>
          </div>
          <div className="stat-card">
            <div className="stat-val">{activeListings.length}</div>
            <div className="stat-lbl">Active listings</div>
          </div>
          <div className="stat-card">
            <div className="stat-val">{orders.length}</div>
            <div className="stat-lbl">Total orders</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-val">{pendingOrders.length}</div>
            <div className="stat-lbl">Pending pickup</div>
          </div>
        </div>

        {/* Listings */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="section-lbl" style={{ margin: 0 }}>Your listings</div>
          {listings.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
              Updates in real time ●
            </span>
          )}
        </div>

        {listingsLoading ? (
          <div className="spinner" style={{ margin: '24px auto' }} />
        ) : listings.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <div className="icon">🍽️</div>
            <h3>No listings yet</h3>
            <p>Post your first surplus item and start earning from food that would otherwise go to waste.</p>
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => nav('/post')}>
              Post first item
            </button>
          </div>
        ) : (
          <>
            {listings.map(l => (
              <div className="listing-card" key={l.id}>
                <div className="lc-top">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1 }}>
                    <span style={{ fontSize: 24 }}>{l.emoji || '🍽️'}</span>
                    <div className="lc-name">{l.name}</div>
                  </div>
                  {statusPill(l)}
                </div>
                <div className="lc-meta">
                  <span>{l.quantityLeft}/{l.quantity} left</span>
                  <span>·</span>
                  <span>Pickup by {timeDisplay(l.pickupBy)}</span>
                  <span>·</span>
                  <span>{l.category}</span>
                </div>
                <div className="lc-footer">
                  <div className="lc-price">
                    ₹{l.originalPrice} → <b>₹{l.discountedPrice}</b>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>({l.discount}% off)</span>
                  </div>
                  <div className="lc-actions">
                    <button className="btn-sm-danger" onClick={() => removeListing(l.id)}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
            <button className="btn-primary" onClick={() => nav('/post')}>
              + Add new surplus item
            </button>
          </>
        )}
      </div>
      <RestaurantNav />
    </>
  );
}
