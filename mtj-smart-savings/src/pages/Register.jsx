import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import Layout from '../components/Layout';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ fullName: '', phone: '', email: '', pin: '' });

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cleanPhone = formData.phone.replace(/\s/g, '');
      if (formData.pin.length !== 4) throw new Error('PIN must be exactly 4 digits');

      const hiddenEmail = formData.email || `${cleanPhone}@mtj.app`;
      const hiddenPassword = `${formData.pin}_mtj_secret_salt`;

      // 1. Create Auth User
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: hiddenEmail,
        password: hiddenPassword,
        options: { data: { full_name: formData.fullName, phone: cleanPhone } }
      });
      if (authErr) throw authErr;

      // 2. Create Profile
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: authData.user.id,
        full_name: formData.fullName,
        phone: cleanPhone,
        role: 'user',
        pin_hash: btoa(formData.pin),
        card_qr_token: 'MTJ-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        card_status: 'pending',
        trust_score: 50
      });
      if (profileErr) throw profileErr;

      // 3. Create 5 Wallets
      const types = ['daily', 'rotation', 'target', 'loan', 'rewards'];
      await supabase.from('wallets').insert(types.map(t => ({ user_id: authData.user.id, type: t })));

      alert('✅ Account created! Please login.');
      navigate('/login');

    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div style={{ padding: '40px 24px' }}>
        <h1 style={{ color: '#111827', fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Join MTJ</h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '30px' }}>Start saving in less than 60 seconds.</p>

        {error && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>{error}</div>}

        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Full Name</label>
            <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required style={{ width: '100%', padding: '14px', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '15px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Phone Number</label>
            <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required style={{ width: '100%', padding: '14px', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '15px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Email <span style={{fontWeight: '400', color: '#9CA3AF'}}>(Optional)</span></label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', padding: '14px', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '15px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Create 4-Digit PIN</label>
            <input type="password" inputMode="numeric" maxLength={4} value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} required style={{ width: '100%', padding: '14px', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '24px', letterSpacing: '12px', textAlign: 'center', boxSizing: 'border-box', fontWeight: '700' }} />
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '16px', background: loading ? '#9CA3AF' : '#00B875', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '30px', fontSize: '14px', color: '#6B7280' }}>
          Already have an account? <Link to="/login" style={{ color: '#00B875', fontWeight: '700', textDecoration: 'none' }}>Login</Link>
        </p>
      </div>
    </Layout>
  );
}