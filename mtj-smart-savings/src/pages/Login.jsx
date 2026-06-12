import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import '../styles/auth.css';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
      if (err) throw err;
      navigate('/');
    } catch (err) { setError(err.message === 'Invalid login credentials' ? 'Wrong email or password.' : err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand-badge">MTJ</div>
        <h1>Welcome Back</h1>
        <p className="sub">Save Today. Secure Tomorrow.</p>
        <form onSubmit={handleSubmit}>
          <label>Email <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Password <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></label>
          {error && <div className="alert error">{error}</div>}
          <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
        </form>
        <p className="auth-link">New here? <Link to="/register">Create an account</Link></p>
      </div>
    </div>
  );
}
