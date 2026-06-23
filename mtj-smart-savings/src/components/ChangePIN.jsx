import { useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

export default function ChangePIN({ onClose }) {
  const { user, profile } = useAuth();
  const [currentPIN, setCurrentPIN] = useState('');
  const [newPIN, setNewPIN] = useState('');
  const [confirmPIN, setConfirmPIN] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleChange(e) {
    e.preventDefault();
    setError('');
    if (!/^\d{4}$/.test(currentPIN) || !/^\d{4}$/.test(newPIN)) return setError('PINs must be 4 digits');
    if (newPIN !== confirmPIN) return setError('New PINs do not match');
    if (currentPIN === newPIN) return setError('New PIN must be different');

    setLoading(true);
    try {
      if (btoa(currentPIN) !== profile.pin_hash) throw new Error('Current PIN is incorrect');
      const { error: authErr } = await supabase.auth.updateUser({ password: newPIN + '_mtj_secret_salt' });
      if (authErr) throw authErr;
      await supabase.from('profiles').update({ pin_hash: btoa(newPIN) }).eq('id', user.id);
      setSuccess(true);
      setTimeout(async () => { await supabase.auth.signOut(); window.location.href = '/login'; }, 2000);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '28px', maxWidth: '400px', width: '100%' }}>
        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ margin: '0 0 12px 0', color: '#00B875' }}>PIN Changed!</h2>
            <p style={{ color: '#6B7280', fontSize: '14px' }}>Logging you out...</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#111827', fontSize: '18px' }}> Change PIN</h2>
              <button onClick={onClose} style={{ background: '#F4F6F8', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>×</button>
            </div>
            {error && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}
            <form onSubmit={handleChange}>
              {['Current PIN', 'New PIN', 'Confirm New PIN'].map((label, i) => (
                <div key={i} style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>{label}</label>
                  <input type="password" inputMode="numeric" maxLength={4} value={[currentPIN, newPIN, confirmPIN][i]} onChange={e => [setCurrentPIN, setNewPIN, setConfirmPIN][i](e.target.value)} required style={{ width: '100%', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '20px', letterSpacing: '8px', textAlign: 'center', boxSizing: 'border-box' }} />
                </div>
              ))}
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? '#9CA3AF' : '#00B875', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
                {loading ? 'Changing...' : 'Update PIN'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}