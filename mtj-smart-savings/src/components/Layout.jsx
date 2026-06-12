import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import BottomNav from './BottomNav';

export default function Layout({ children }) {
  const navigate = useNavigate();
  async function logout() { await supabase.auth.signOut(); navigate('/login'); }
  return (
    <div style={{ minHeight: '100vh', maxWidth: 480, margin: '0 auto', background: 'var(--bg)', paddingBottom: 80 }}>
      {children}
      <div style={{ padding: 24, textAlign: 'center' }}>
        <button className="outline" onClick={logout}>Sign Out</button>
      </div>
      <BottomNav />
    </div>
  );
}
