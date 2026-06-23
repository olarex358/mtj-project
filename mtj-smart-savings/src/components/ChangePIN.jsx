import React, { useState } from 'react';
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

  async function handleChangePIN(e) {
    e.preventDefault();
    setError('');

    // Validation
    if (!/^\d{4}$/.test(currentPIN)) {
      return setError('Current PIN must be 4 digits');
    }
    if (!/^\d{4}$/.test(newPIN)) {
      return setError('New PIN must be 4 digits');
    }
    if (newPIN !== confirmPIN) {
      return setError('New PINs do not match');
    }
    if (currentPIN === newPIN) {
      return setError('New PIN must be different from current PIN');
    }

    setLoading(true);

    try {
      // 1. Verify current PIN
      if (btoa(currentPIN) !== profile.pin_hash) {
        throw new Error('Current PIN is incorrect');
      }

      // 2. Update Supabase Auth password
      const newPassword = newPIN + '_mtj_secret_salt';
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (authError) throw authError;

      // 3. Update pin_hash in profiles table
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ pin_hash: btoa(newPIN) })
        .eq('id', user.id);

      if (dbError) throw dbError;

      setSuccess(true);

      // 4. Force logout after 2 seconds (since password changed)
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '28px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ margin: '0 0 12px 0', color: '#00B875', fontSize: '22px' }}>
              PIN Changed Successfully!
            </h2>
            <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '20px' }}>
              You will be logged out and need to login with your new PIN.
            </p>
            <div style={{ background: '#F0FDF4', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#166534' }}>
              Redirecting to login...
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, color: '#111827', fontSize: '20px' }}>
                🔐 Change PIN
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: '#F4F6F8',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  fontSize: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                ❌ {error}
              </div>
            )}

            <form onSubmit={handleChangePIN}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Current PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={currentPIN}
                  onChange={(e) => setCurrentPIN(e.target.value)}
                  placeholder="****"
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '12px',
                    fontSize: '24px',
                    letterSpacing: '12px',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    fontWeight: '700'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  New PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={newPIN}
                  onChange={(e) => setNewPIN(e.target.value)}
                  placeholder="****"
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '12px',
                    fontSize: '24px',
                    letterSpacing: '12px',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    fontWeight: '700',
                    color: '#00B875'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Confirm New PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={confirmPIN}
                  onChange={(e) => setConfirmPIN(e.target.value)}
                  placeholder="****"
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '12px',
                    fontSize: '24px',
                    letterSpacing: '12px',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    fontWeight: '700',
                    color: '#00B875'
                  }}
                  required
                />
              </div>

              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', color: '#92400E' }}>
                ⚠️ You will be logged out after changing your PIN and will need to login with the new PIN.
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: loading ? '#9CA3AF' : '#00B875',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {loading ? 'Changing PIN...' : 'Change PIN'}
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'white',
                  color: '#6B7280',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                Cancel
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}