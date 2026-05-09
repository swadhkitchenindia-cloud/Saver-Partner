import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';

import RestaurantLogin from './pages/restaurant/Login';
import RestaurantRegister from './pages/restaurant/Register';
import RestaurantDashboard from './pages/restaurant/Dashboard';
import RestaurantPost from './pages/restaurant/PostItem';
import RestaurantOrders from './pages/restaurant/Orders';
import RestaurantEarnings from './pages/restaurant/Earnings';
import RestaurantProfile from './pages/restaurant/Profile';

function PartnerRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="app-shell"><div className="spinner" /></div>;
  if (!user || profile?.role !== 'restaurant') return <Navigate to="/login" replace />;
  return <div className="app-shell">{children}</div>;
}

function PublicRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="app-shell"><div className="spinner" /></div>;
  if (user && profile?.role === 'restaurant') return <Navigate to="/dashboard" replace />;
  return <div className="app-shell">{children}</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicRoute><RestaurantLogin /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><RestaurantLogin /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RestaurantRegister /></PublicRoute>} />
          <Route path="/dashboard" element={<PartnerRoute><RestaurantDashboard /></PartnerRoute>} />
          <Route path="/post" element={<PartnerRoute><RestaurantPost /></PartnerRoute>} />
          <Route path="/orders" element={<PartnerRoute><RestaurantOrders /></PartnerRoute>} />
          <Route path="/earnings" element={<PartnerRoute><RestaurantEarnings /></PartnerRoute>} />
          <Route path="/profile" element={<PartnerRoute><RestaurantProfile /></PartnerRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
