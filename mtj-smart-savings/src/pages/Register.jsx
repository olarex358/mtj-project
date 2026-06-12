import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import '../styles/auth.css';

function generateQRToken() { return 'MTJ-' + Math.random().toString(36).slice(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase(); }
function hashPin(pin) { return btoa('mtj_salt_' + pin); }

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '', pin: '', pinConfirm: '', role: 'user' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

    async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create Auth User
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: formData.email, password: formData.password,
        options: { data: { full_name: formData.fullName, phone: formData.phone } }
      });
      if (authErr) throw authErr;

      // 2. Generate Referral Code & QR Token
      const referralCode = 'MTJ' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const qrToken = 'MTJ-' + Math.random().toString(36).substring(2, 10).toUpperCase();

      // 3. Create Profile (Self-Registered = No Agent Link)
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: authData.user.id, full_name: formData.fullName, phone: formData.phone,
        role: 'user', pin_hash: btoa(formData.pin), card_qr_token: qrToken,
        card_status: 'pending', trust_score: 40, // Self-registered start lower
        referral_code: referralCode
      });
      if (profileErr) throw profileErr;

      // 4. Create Wallets
      const walletTypes = ['daily', 'rotation', 'target', 'loan', 'rewards'];
      await supabase.from('wallets').insert(walletTypes.map(t => ({ user_id: authData.user.id, type: t })));

      alert(`✅ Account Created! Your Referral Code: ${referralCode}\nPlease pay ₦200 for your physical card.`);
      navigate('/login');
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  }
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand-badge">MTJ</div>
        <h1>Join MTJ Smart Savings</h1>
        <p className="sub">Save Today. Secure Tomorrow.</p>
        <form onSubmit={handleSubmit}>
          <label>Full Name <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required /></label>
          <label>Phone <input value={form.phone} placeholder="08012345678" onChange={e => setForm({...form, phone: e.target.value})} required /></label>
          <label>Email <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></label>
          <label>Password <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} minLength={6} required /></label>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
            <label>4-Digit PIN <input type="password" maxLength={4} value={form.pin} onChange={e => setForm({...form, pin: e.target.value.replace(/\D/g,'')})} required /></label>
            <label>Confirm PIN <input type="password" maxLength={4} value={form.pinConfirm} onChange={e => setForm({...form, pinConfirm: e.target.value.replace(/\D/g,'')})} required /></label>
          </div>
          <label>I am a… <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}><option value="user">Member</option><option value="agent">MTJ Smart Agent</option></select></label>
          {error && <div className="alert error">{error}</div>}
          <button type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Create Account'}</button>
        </form>
        <p className="auth-link">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
