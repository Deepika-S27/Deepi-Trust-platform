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

      // Safety timeout: always show the app within 5 seconds
      const safetyTimer = setTimeout(finishLoading, 5000);

      let subscription = null;
      try {
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            try {
              const { data: profile } = await supabase
                .from('profiles').select('*').eq('id', session.user.id).single();
              if (profile) setUser(profile);
            } catch (_) { /* profile fetch failed, continue */ }
          } else {
            setUser(null);
          }
          finishLoading();
        });
        subscription = data.subscription;

        // Check initial session
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

  const login = async (email, password) => {
    setUser(null);
    localStorage.removeItem('deepi_auth_user');

    if (isDemoMode) {
      // ── Demo mode: use localDB ────────────────────────────────────────
      // Auto-create admin account for demo mode
      if (email === 'admin@deepitrust.org' && password === 'admin123') {
        const adminUser = {
          id: 'admin-001',
          email: 'admin@deepitrust.org',
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
      await db.addNotification({
        user_id: result.data.id, role: result.data.role,
        title: 'Welcome Back!',
        message: `Logged in successfully as ${result.data.role}`,
        type: 'info'
      });
      return { data: result.data };
    } else {
      // ── Supabase mode: use real auth ─────────────────────────────────
      const result = await db.login(email, password);
      if (result.error) return { error: result.error };
      // In Supabase mode, onAuthStateChange listener sets user automatically
      // But we also set it here for immediate UI update
      setUser(result.data);
      try {
        await db.addNotification({
          user_id: result.data.id, role: result.data.role,
          title: 'Welcome Back!',
          message: `Logged in successfully as ${result.data.role}`,
          type: 'info'
        });
      } catch (_) { /* notification is non-critical */ }
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
      // In Supabase mode, auth listener will handle setting user
      setUser(result.data);
    }

    // Notify admin about new signup — in Supabase mode, find the actual admin
    try {
      if (isDemoMode) {
        await db.addNotification({
          user_id: 'admin-001', role: 'admin',
          title: 'New User Registered',
          message: `${result.data.name} signed up as ${result.data.role}`,
          type: 'info'
        });
      } else {
        // For Supabase: send notification to all admins
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
