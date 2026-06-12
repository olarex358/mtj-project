import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { recordEntry } from '../lib/ledger';
import { queueTransaction } from '../lib/offline';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import OnlineStatus from '../components/OnlineStatus';
import '../styles/forms.css';

export default function Transaction() {
  const { type } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [qrToken, setQrToken] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [targetWallet, setTargetWallet] = useState('daily');
  const [status, setStatus] = useState({ msg: '', type: '' });
  const [profile, setProfile] = useState(null);
  const [agentFloat, setAgentFloat] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  async function checkAgentFloat() {
    // Check agent's unremitted balance vs float limit
    const { data: agentProfile } = await supabase.from('profiles').select('unremitted_balance, float_limit').eq('id', user.id).single();
    if (agentProfile) {
      setAgentFloat(agentProfile.unremitted_balance || 0);
      if ((agentProfile.unremitted_balance || 0) >= (agentProfile.float_limit || 50000)) {
        setStatus({ msg: `⚠️ Float Limit Reached! Please remit ₦${agentProfile.unremitted_balance} to MTJ before collecting more cash.`, type: 'error' });
        return false;
      }
    }
    return true;
  }

  async function handleScan() {
    if (!qrToken || qrToken.trim() === '') return setStatus({ msg: 'Please enter a QR token first', type: 'error' });
    
    // Check Agent Float Limit before allowing scan
    const canProceed = await checkAgentFloat();
    if (!canProceed) return;

    const { data } = await supabase.from('profiles').select('id,card_frozen,failed_pin_attempts,full_name,savings_locked').eq('card_qr_token', qrToken).single();

    if (!data) return setStatus({ msg: '❌ Invalid QR card', type: 'error' });
    if (data.card_frozen) return setStatus({ msg: '❄ Card is frozen', type: 'error' });
    if (data.failed_pin_attempts >= 3) return setStatus({ msg: '🔒 Card locked', type: 'error' });
    
    // Check Savings Lock
    if (type === 'withdraw' && data.savings_locked) {
      return setStatus({ msg: '🔒 Member has locked their Daily Savings. Cannot withdraw.', type: 'error' });
    }

    setProfile(data);
    setStatus({ msg: '', type: '' });
    setStep(2);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (type === 'withdraw' && !isOnline) return setStatus({ msg: '⚠️ PIN verification requires internet.', type: 'error' });

    if (type === 'withdraw') {
      const { data: prof } = await supabase.from('profiles').select('pin_hash,failed_pin_attempts').eq('card_qr_token', qrToken).single();
      if (btoa(pin) !== prof.pin_hash) {
        await supabase.from('profiles').update({ failed_pin_attempts: (prof.failed_pin_attempts || 0) + 1 }).eq('card_qr_token', qrToken);
        return setStatus({ msg: '❌ Incorrect PIN', type: 'error' });
      }
    }

    const txn = {
      userId: profile.id, agentId: user.id, walletType: targetWallet,
      type: type === 'deposit' ? 'deposit' : 'withdrawal',
      amount: Number(amount), direction: type === 'deposit' ? 'credit' : 'debit',
      reference: qrToken, note: type + ' via QR',
    };

    try {
      if (isOnline) {
        const { data: wallet } = await supabase.from('wallets').select('id').eq('user_id', profile.id).eq('type', targetWallet).single();
        await recordEntry({ ...txn, walletId: wallet.id });
        
        // Update Agent Float if it's a deposit
        if (type === 'deposit') {
          await supabase.rpc('increment_agent_float', { agent_id: user.id, amount: Number(amount) });
        }
        
        setStatus({ msg: '✅ ' + (type === 'deposit' ? 'Deposit' : 'Withdrawal') + ' successful', type: 'success' });
      } else {
        await queueTransaction(txn);
        setStatus({ msg: '⏳ Saved offline. Will sync when online.', type: 'success' });
      }
      setTimeout(() => navigate(-1), 1500);
    } catch (err) { setStatus({ msg: err.message, type: 'error' }); }
  }

  return (
    <Layout>
      <OnlineStatus />
      <h2 style={{ padding: '24px 16px 8px' }}>{type === 'deposit' ? '💵 Deposit' : '📤 Withdraw'}</h2>
      {status.msg && <div className={'alert ' + status.type}>{status.msg}</div>}
      <form onSubmit={handleSubmit} className="card-form">
        {step === 1 && (
          <>
            <label>Scan User QR Card<input value={qrToken} onChange={e => setQrToken(e.target.value)} placeholder="Scan or paste QR token" required /></label>
            <button type="button" onClick={handleScan}>Verify Card →</button>
          </>
        )}
        {step === 2 && (
          <>
            <div className="profile-chip">👤 {profile ? profile.full_name : ''}</div>
            <label>Wallet Type
              <select value={targetWallet} onChange={e => setTargetWallet(e.target.value)}>
                <option value="daily">Daily Savings</option><option value="rotation">Rotation</option><option value="target">Target</option>
              </select>
            </label>
            <label>Amount (₦)<input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="1" placeholder="e.g. 1000" /></label>
            {type === 'withdraw' && <label>User PIN<input type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} required /></label>}
            <button type="submit">{isOnline ? 'Confirm ' + type : '💾 Save Offline'}</button>
          </>
        )}
      </form>
    </Layout>
  );
}