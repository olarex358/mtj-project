import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import Layout from '../components/Layout';

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cleanPhone = phone.replace(/\s/g, '');
      if (cleanPhone.length < 10) throw new Error('Invalid phone number');
      if (pin.length !== 4) throw new Error('PIN must be 4 digits');

      // The Magic Hack: Convert Phone/PIN to Email/Password for Supabase
      const hiddenEmail = `${cleanPhone}@mtj.app`;
      const hiddenPassword = `${pin}_mtj_secret_salt`;

      const { error } = await supabase.auth.signInWithPassword({
        email: hiddenEmail,
        password: hiddenPassword,
      });

      if (error) throw error;
      navigate('/dashboard'); 
    } catch (err) {
      setError('Invalid Phone Number or PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ color: '#00B875', fontSize: '28px', fontWeight: '800', margin: 0 }}>MTJ</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '8px' }}>Smart Savings · Secure Tomorrow</p>
        </div>

        {error && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Phone Number</label>
            <input 
              type="tel" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              placeholder="e.g. 08012345678" 
              required 
              style={{ width: '100%', padding: '16px', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '16px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>4-Digit PIN</label>
            <input 
              type="password" 
              inputMode="numeric" 
              pattern="[0-9]*" 
              maxLength={4} 
              value={pin} 
              onChange={e => setPin(e.target.value)} 
              placeholder="****" 
              required 
              style={{ width: '100%', padding: '16px', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '24px', letterSpacing: '12px', textAlign: 'center', boxSizing: 'border-box', outline: 'none', fontWeight: '700' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={{ width: '100%', padding: '16px', background: loading ? '#9CA3AF' : '#00B875', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '30px', fontSize: '14px', color: '#6B7280' }}>
          Don't have an account? <Link to="/register" style={{ color: '#00B875', fontWeight: '700', textDecoration: 'none' }}>Create one</Link>
        </p>
      </div>
    </Layout>
  );
}