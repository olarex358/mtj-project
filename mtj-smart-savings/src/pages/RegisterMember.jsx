import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function RegisterMember() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', pin: '' });
  const [success, setSuccess] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanPhone = form.phone.replace(/\s/g, '');
      if (form.pin.length !== 4) throw new Error('PIN must be 4 digits');

      const hiddenEmail = `${cleanPhone}@mtj.app`;
      const hiddenPassword = `${form.pin}_mtj_secret_salt`;

      const { data: authData, error: authErr } = await supabase.auth.signUp({ email: hiddenEmail, password: hiddenPassword });
      if (authErr) throw authErr;

      const qrToken = 'MTJ-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      await supabase.from('profiles').insert({
        id: authData.user.id, full_name: form.fullName, phone: cleanPhone, role: 'user',
        pin_hash: btoa(form.pin), card_qr_token: qrToken, card_status: 'pending',
        trust_score: 50, referred_by_agent_id: user.id
      });

      const types = ['daily', 'rotation', 'target', 'loan', 'rewards'];
      await supabase.from('wallets').insert(types.map(t => ({ user_id: authData.user.id, type: t })));

      const waMsg = `Welcome to MTJ! 🟢\nName: ${form.fullName}\nPhone: ${cleanPhone}\nPIN: ${form.pin}\nTotal Paid: 400. Save Today, Secure Tomorrow!`;
      setSuccess({ phone: cleanPhone, pin: form.pin, waLink: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}` });
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  }

  if (success) {
    return (
      <Layout>
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ color: '#00B875', marginBottom: '8px' }}>Member Registered!</h2>
          <p style={{ color: '#6B7280', marginBottom: '24px' }}>Share these details with the member:</p>
          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <p style={{ margin: '8px 0', fontSize: '14px' }}><strong>Phone:</strong> {success.phone}</p>
            <p style={{ margin: '8px 0', fontSize: '14px' }}><strong>PIN:</strong> <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#00B875', letterSpacing: '8px' }}>{success.pin}</span></p>
          </div>
          <a href={success.waLink} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', marginBottom: '12px' }}>
            <button style={{ width: '100%', padding: '14px', background: '#25D366', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>📲 Send WhatsApp Receipt</button>
          </a>
          <button onClick={() => { setSuccess(null); setForm({ fullName: '', phone: '', pin: '' }); }} style={{ width: '100%', padding: '14px', background: 'white', color: '#00B875', border: '2px solid #00B875', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>Register Another</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '24px 20px' }}>
        <h1 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '22px' }}>📝 Register Member</h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '24px' }}>Collect ₦400 before submitting.</p>
        <form onSubmit={handleSubmit}>
          {[
            { label: 'Full Name', type: 'text', key: 'fullName', ph: 'e.g. Adebayo Johnson' },
            { label: 'Phone Number', type: 'tel', key: 'phone', ph: 'e.g. 08012345678' }
          ].map(f => (
            <div key={f.key} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} required placeholder={f.ph} style={{ width: '100%', padding: '14px', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '15px', boxSizing: 'border-box' }} />
            </div>
          ))}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Set 4-Digit PIN <span style={{fontWeight: '400', color: '#9CA3AF'}}>(Member will use this to login)</span></label>
            <input type="password" inputMode="numeric" maxLength={4} value={form.pin} onChange={e => setForm({...form, pin: e.target.value})} required placeholder="****" style={{ width: '100%', padding: '14px', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '24px', letterSpacing: '12px', textAlign: 'center', boxSizing: 'border-box', fontWeight: '700', color: '#00B875' }} />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '16px', background: loading ? '#9CA3AF' : '#00B875', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
            {loading ? 'Registering...' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </Layout>
  );
}