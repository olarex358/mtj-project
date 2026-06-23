import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { recordEntry } from '../lib/ledger';
import { queueTransaction } from '../lib/offline';
import { useAuth } from '../context/AuthContext';
import { Html5QrcodeScanner } from 'html5-qrcode';
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // QR Camera Scanner States
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Initialize Camera Scanner when opened
  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner("tx-qr-reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 } 
      });
      scanner.render(onScanSuccess, () => {}); // Ignore scan errors
      scannerRef.current = scanner;
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error(err));
      }
    };
  }, [showScanner]);

  // What happens when the camera successfully scans a code
  async function onScanSuccess(decodedText) {
    setQrToken(decodedText.trim());
    setShowScanner(false); // Close camera
    // Auto-verify the scanned card after a short delay
    setTimeout(() => handleScan(), 300);
  }

  async function handleScan() {
    if (!qrToken || qrToken.trim() === '') {
      return setStatus({ msg: 'Please enter a QR token first', type: 'error' });
    }

    const { data } = await supabase
      .from('profiles')
      .select('id,card_frozen,failed_pin_attempts,full_name,savings_locked')
      .eq('card_qr_token', qrToken)
      .single();

    if (!data) return setStatus({ msg: '❌ Invalid QR card', type: 'error' });
    if (data.card_frozen) return setStatus({ msg: '❄ Card is frozen', type: 'error' });
    if (data.failed_pin_attempts >= 3) return setStatus({ msg: '🔒 Card locked', type: 'error' });
    if (type === 'withdraw' && data.savings_locked) {
      return setStatus({ msg: '🔒 Member has locked savings', type: 'error' });
    }

    setProfile(data);
    setStatus({ msg: '', type: '' });
    setStep(2);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (type === 'withdraw' && !isOnline) {
      return setStatus({ msg: '⚠️ PIN verification requires internet.', type: 'error' });
    }

    if (type === 'withdraw') {
      const { data: prof } = await supabase
        .from('profiles')
        .select('pin_hash,failed_pin_attempts')
        .eq('card_qr_token', qrToken)
        .single();

      if (btoa(pin) !== prof.pin_hash) {
        await supabase
          .from('profiles')
          .update({ failed_pin_attempts: (prof.failed_pin_attempts || 0) + 1 })
          .eq('card_qr_token', qrToken);
        return setStatus({ msg: '❌ Incorrect PIN', type: 'error' });
      }
    }

    const txn = {
      userId: profile.id,
      agentId: user.id,
      walletType: targetWallet,
      type: type === 'deposit' ? 'deposit' : 'withdrawal',
      amount: Number(amount),
      direction: type === 'deposit' ? 'credit' : 'debit',
      reference: qrToken,
      note: type + ' via QR',
    };

    try {
      if (isOnline) {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('id')
          .eq('user_id', profile.id)
          .eq('type', targetWallet)
          .single();
        await recordEntry({ ...txn, walletId: wallet.id });
        setStatus({
          msg: '✅ ' + (type === 'deposit' ? 'Deposit' : 'Withdrawal') + ' successful',
          type: 'success',
        });
      } else {
        await queueTransaction(txn);
        setStatus({ msg: '⏳ Saved offline. Will sync when online.', type: 'success' });
      }
      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      setStatus({ msg: err.message, type: 'error' });
    }
  }

  return (
    <Layout>
      <OnlineStatus />
      <h2 style={{ padding: '24px 16px 8px' }}>
        {type === 'deposit' ? '💵 Collect Savings' : '📤 Process Withdrawal'}
      </h2>
      {status.msg && <div className={'alert ' + status.type}>{status.msg}</div>}

      <form onSubmit={handleSubmit} className="card-form">
        {step === 1 && (
          <>
            {!showScanner ? (
              <>
                <label>
                  Member QR Token
                  <input
                    value={qrToken}
                    onChange={(e) => setQrToken(e.target.value)}
                    placeholder="e.g. MTJ-8X92K1"
                    required
                  />
                </label>
                <button type="button" onClick={() => setShowScanner(true)} className="outline" style={{marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                  📷 Scan Member's Card with Camera
                </button>
                <button type="button" onClick={handleScan}>
                  Verify Card Manually →
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <h3 style={{fontSize: '16px', marginBottom: '15px'}}>Point camera at Member's QR Card</h3>
                <div id="tx-qr-reader" style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}></div>
                <button type="button" className="outline" onClick={() => setShowScanner(false)} style={{marginTop: '20px', width: '100%'}}>
                  Cancel Scanner
                </button>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div className="profile-chip">👤 {profile ? profile.full_name : ''}</div>
            <label>
              Wallet Type
              <select
                value={targetWallet}
                onChange={(e) => setTargetWallet(e.target.value)}
              >
                <option value="daily">Daily Savings</option>
                <option value="rotation">Rotation (Esusu)</option>
                <option value="target">Target Savings</option>
              </select>
            </label>
            <label>
              Amount (₦)
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="1"
                placeholder="e.g. 1000"
              />
            </label>
            {type === 'withdraw' && (
              <label>
                Enter Member's 4-Digit PIN
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                  style={{ letterSpacing: '8px', fontSize: '20px', textAlign: 'center' }}
                />
              </label>
            )}
            <button type="submit">
              {isOnline ? '✅ Confirm ' + type : '💾 Save Offline'}
            </button>
          </>
        )}
      </form>
    </Layout>
  );
}