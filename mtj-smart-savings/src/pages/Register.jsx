import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import Layout from '../components/Layout';
import '../styles/forms.css';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '', // Now optional
    pin: ''
  });

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cleanPhone = formData.phone.replace(/\s/g, '');
      
      // If no email provided, generate a hidden one based on phone
      const hiddenEmail = formData.email ? formData.email : `${cleanPhone}@mtj.app`;
      
      // Supabase requires 6+ chars for password, so we append a hidden salt to the PIN
      const hiddenPassword = formData.pin + '_mtj_secret_salt';

      // 1. Create Auth User
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: hiddenEmail,
        password: hiddenPassword,
        options: {
          data: {
            full_name: formData.fullName,
            phone: cleanPhone
          }
        }
      });

      if (authErr) throw authErr;

      // 2. Create Profile in 'profiles' table
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: authData.user.id,
        full_name: formData.fullName,
        phone: cleanPhone,
        role: 'user',
        pin_hash: btoa(formData.pin), // Store 4-digit PIN hash for quick local checks
        card_qr_token: 'MTJ-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        card_status: 'pending',
        trust_score: 40 // Self-registered users start with lower trust
      });

      if (profileErr) throw profileErr;

      // 3. Create 5 Wallets for the new user
      const walletTypes = ['daily', 'rotation', 'target', 'loan', 'rewards'];
      await supabase.from('wallets').insert(
        walletTypes.map(t => ({ user_id: authData.user.id, type: t }))
      );

      alert('✅ Account created successfully! Please login.');
      navigate('/login');

    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="auth-container">
        <div className="auth-header">
          <h1>Join MTJ Savings</h1>
          <p>Create your account in seconds.</p>
        </div>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={handleRegister} className="card-form">
          <label>
            Full Name
            <input 
              type="text" 
              value={formData.fullName} 
              onChange={e => setFormData({...formData, fullName: e.target.value})} 
              required 
              placeholder="e.g. Adebayo Johnson"
            />
          </label>

          <label>
            Phone Number
            <input 
              type="tel" 
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})} 
              required 
              placeholder="e.g. 08012345678"
            />
          </label>

          <label>
            Email Address <span style={{fontSize: '12px', color: 'var(--muted)'}}>(Optional)</span>
            <input 
              type="email" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              placeholder="Leave blank to use phone number"
            />
          </label>

          <label>
            Create 4-Digit PIN
            <input 
              type="password" 
              inputMode="numeric" 
              pattern="[0-9]*" 
              maxLength={4} 
              value={formData.pin} 
              onChange={e => setFormData({...formData, pin: e.target.value})} 
              required 
              placeholder="****"
              style={{ letterSpacing: '8px', fontSize: '20px', textAlign: 'center' }}
            />
          </label>

          <button type="submit" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 'bold' }}>Login</Link>
        </p>
      </div>
    </Layout>
  );
}