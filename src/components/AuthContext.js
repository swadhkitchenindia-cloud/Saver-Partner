import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) setProfile(snap.data());
        else setProfile(null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Setup invisible recaptcha for phone auth
  const setupRecaptcha = (elementId) => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
      size: 'invisible',
      callback: () => {},
    });
    return window.recaptchaVerifier;
  };

  // Send OTP to phone number
  const sendOTP = async (phone, elementId) => {
    const appVerifier = setupRecaptcha(elementId);
    const formatted = phone.startsWith('+') ? phone : '+91' + phone;
    const result = await signInWithPhoneNumber(auth, formatted, appVerifier);
    window.confirmationResult = result;
    return result;
  };

  // Verify OTP and create/login customer
  const verifyOTPAndLogin = async (otp, name, phone) => {
    const result = await window.confirmationResult.confirm(otp);
    const u = result.user;
    const snap = await getDoc(doc(db, 'users', u.uid));
    if (!snap.exists()) {
      // New user — create profile
      const data = {
        role: 'customer',
        name: name || 'Food Lover',
        phone: phone,
        email: '',
        createdAt: Date.now(),
        totalSaved: 0,
        mealsRescued: 0,
        rewardPoints: 0,
        isNewUser: true,
      };
      await setDoc(doc(db, 'users', u.uid), data);
      setProfile(data);
      return { user: u, isNewUser: true };
    } else {
      const data = snap.data();
      // Update name if provided
      if (name && !data.name) await updateDoc(doc(db, 'users', u.uid), { name });
      setProfile(data);
      return { user: u, isNewUser: false };
    }
  };

  // Restaurant registration — one atomic setDoc with all fields
  // Accepts full data object so no separate updateDoc is needed
  const registerRestaurant = async (email, password, fullData) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      ...fullData,
      email,
      createdAt: Date.now(),
      rating: 0,
      totalOrders: 0,
      imageUrl: '',
    });
    // Note: we do NOT setProfile here — signOut fires right after in Register.js
    return cred;
  };

  const loginRestaurant = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const updateProfile = async (data) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), data);
    setProfile(p => ({ ...p, ...data }));
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      sendOTP, verifyOTPAndLogin,
      registerRestaurant, loginRestaurant,
      updateProfile, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
