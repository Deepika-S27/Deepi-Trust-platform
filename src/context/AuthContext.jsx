import React, { createContext, useState, useContext, useEffect } from 'react';
import { db, isDemoMode, supabase } from '../config/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      // ── Demo mode: use localStorage-based auth ──────────────────────────
      const stored = localStorage.getItem('deepi_auth_user');
      if (stored) {
        try { setUser(JSON.parse(stored)); }
        catch (_) { localStorage.removeItem('deepi_auth_user'); }
      }
      setLoading(false);
    } else {
      // ── Supabase mode: real auth with listener ─────────────────────────
      let loadingDone = false;
      const finishLoading = () => {
        if (!loadingDone) { loadingDone = true; setLoading(false); }
      };

      const safetyTimer = setTimeout(finishLoading, 5000);

      let subscription = null;
      try {
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            try {
              const { data: profile } = await supabase
                .from('profiles').select('*').eq('id', session.user.id).single();
              if (profile) setUser(profile);
            } catch (_) { /* profile fetch failed */ }
          } else {
            setUser(null);
          }
          finishLoading();
        });
        subscription = data.subscription;

        supabase.auth.getSession().then(async ({ data: { session } }) => {
          if (session?.user) {
            try {
              const { data: profile } = await supabase
                .from('profiles').select('*').eq('id', session.user.id).single();
              if (profile) setUser(profile);
            } catch (_) { /* ignore */ }
          }
          finishLoading();
        }).catch(() => finishLoading());
      } catch (_) {
        finishLoading();
      }

      return () => {
        clearTimeout(safetyTimer);
        subscription?.unsubscribe();
      };
    }
  }, []);

  const login = async (emailInput, password) => {
    setUser(null);
    localStorage.removeItem('deepi_auth_user');

    // Normalize: if user types a username without @, append @deepitrust.org
    const email = emailInput.includes('@') ? emailInput : `${emailInput}@deepitrust.org`;

    if (isDemoMode) {
      // ── Demo mode only: admin bypass ──────────────────────────────────
      if (email === 'admindeepika@deepitrust.org' && password === 'Admin123') {
        const adminUser = {
          id: 'admin-001',
          email: 'admindeepika@deepitrust.org',
          role: 'admin',
          name: 'Super Admin',
          phone: '+91 90000 00000'
        };
        localStorage.setItem('deepi_auth_user', JSON.stringify(adminUser));
        setUser(adminUser);
        return { data: adminUser };
      }

      const result = db.login(email, password);
      if (result.error) return { error: result.error };
      setUser(result.data);
      localStorage.setItem('deepi_auth_user', JSON.stringify(result.data));
      return { data: result.data };
    } else {
      // ── Supabase mode: real auth ─────────────────────────────────────
      const result = await db.login(email, password);
      if (result.error) return { error: result.error };
      setUser(result.data);
      return { data: result.data };
    }
  };

  const signup = async (userData) => {
    const result = await db.signup(userData);
    if (result.error) return { error: result.error };

    if (isDemoMode) {
      setUser(result.data);
      localStorage.setItem('deepi_auth_user', JSON.stringify(result.data));
    } else {
      setUser(result.data);
    }

    // Notify admin about new signup
    try {
      if (isDemoMode) {
        await db.addNotification({
          user_id: 'admin-001', role: 'admin',
          title: 'New User Registered',
          message: `${result.data.name} signed up as ${result.data.role}`,
          type: 'info'
        });
      } else {
        const admins = await db.getUsersByRole('admin');
        await Promise.all(admins.map(admin =>
          db.addNotification({
            user_id: admin.id, role: 'admin',
            title: 'New User Registered',
            message: `${result.data.name} signed up as ${result.data.role}`,
            type: 'info'
          })
        ));
      }
    } catch (_) { /* notification is non-critical */ }

    return { data: result.data };
  };

  const logout = async () => {
    if (!isDemoMode) {
      try { await supabase.auth.signOut(); } catch (_) {}
    }
    setUser(null);
    localStorage.removeItem('deepi_auth_user');
  };

  const updateUser = (updates) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    if (isDemoMode) {
      localStorage.setItem('deepi_auth_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser, isDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
