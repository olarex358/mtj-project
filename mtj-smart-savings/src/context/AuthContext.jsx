import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });
    
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });
    
    return () => { if (sub?.subscription) sub.subscription.unsubscribe(); };
  }, []);

  async function loadProfile(uid) {
    // Fetch all the new columns we added in Phase 2
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
      
    setProfile(data);
    setLoading(false);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, reloadProfile: () => user ? loadProfile(user.id) : null }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Helper hook to check admin permissions easily
export function useAdminPermissions() {
  const { profile } = useAuth();
  
  const isSuper = profile?.role === 'admin' && profile?.admin_role === 'super';
  const isOps = profile?.role === 'admin' && (profile?.admin_role === 'ops' || profile?.admin_role === 'super');
  const isSupport = profile?.role === 'admin' && (profile?.admin_role === 'support' || profile?.admin_role === 'super' || profile?.admin_role === 'ops');

  return { isSuper, isOps, isSupport, isAdmin: profile?.role === 'admin' };
}