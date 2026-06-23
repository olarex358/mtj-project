import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { recordEntry } from '../lib/ledger';
import { queueTransaction } from '../lib/offline';
import Layout from '../components/Layout';

export default function AgentScanQR() {
  const { user } = useAuth();
  const [scanStep, setScanStep] = useState('scan'); // 'scan', 'confirm', 'processing'
  const [transactionData, setTransactionData] = useState(null);
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState({ msg: '', type: '' });
  const scannerRef = useRef(null);

  useEffect(() => {
    if (scanStep === 'scan') {
      const scanner = new Html5QrcodeScanner("qr-scanner", {
        fps: 10,
        qrbox: { width: 300, height: 300 }
      });
      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error(err));
      }
    };
  }, [scanStep]);

  async function onScanSuccess(decodedText) {
    try {
      const decoded = JSON.parse(atob(decodedText));
      
      // Check if QR is expired
      if (Date.now() > decoded.expiresAt) {
        setStatus({ msg: '❌ QR Code has expired. Please generate a new one.', type: 'error' });
        return;
      }

      setTransactionData(decoded);
      setScanStep('confirm');
    } catch (err) {
      setStatus({ msg: '❌ Invalid QR Code', type: 'error' });
    }
  }

  function onScanFailure(error) {
    // console.warn(`Scan error: ${error}`);
  }

  async function processTransaction() {
    if (transactionData.type === 'withdraw' && !pin) {
      return setStatus({ msg: '❌ Please enter member PIN', type: 'error' });
    }

    setScanStep('processing');

    try {
      // Verify PIN for withdrawals
      if (transactionData.type === 'withdraw') {
        const { data: memberProfile } = await supabase
          .from('profiles')
          .select('pin_hash')
          .eq('id', transactionData.memberId)
          .single();

        if (btoa(pin) !== memberProfile.pin_hash) {
          setStatus({ msg: '❌ Incorrect PIN', type: 'error' });
          setScanStep('confirm');
          return;
        }
      }

      // Get wallet ID
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', transactionData.memberId)
        .eq('type', transactionData.walletType)
        .single();

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Record transaction
      await recordEntry({
        walletId: wallet.id,
        userId: transactionData.memberId,
        agentId: user.id,
        type: transactionData.type,
        amount: transactionData.amount,
        direction: transactionData.type === 'deposit' ? 'credit' : 'debit',
        reference: transactionData.memberId,
        note: `${transactionData.type} via QR scan`
      });

      setStatus({ 
        msg: `✅ ${transactionData.type === 'deposit' ? 'Deposit' : 'Withdrawal'} of ₦${transactionData.amount.toLocaleString()} successful!`, 
        type: 'success' 
      });

      setTimeout(() => {
        window.location.href = '/agent';
      }, 2000);

    } catch (err) {
      setStatus({ msg: 'Error: ' + err.message, type: 'error' });
      setScanStep('confirm');
    }
  }

  return (
    <Layout>
      <h2 style={{ padding: '24px 16px 8px' }}>
        📷 Scan Member QR Code
      </h2>

      {status.msg && (
        <div style={{ margin: '16px', padding: '12px', borderRadius: '8px', background: status.type === 'error' ? '#fdecea' : '#e8f8ef', color: status.type === 'error' ? '#c0392b' : '#27ae60' }}>
          {status.msg}
        </div>
      )}

      {scanStep === 'scan' && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            Point camera at member's QR code
          </p>
          <div id="qr-scanner" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}></div>
        </div>
      )}

      {scanStep === 'confirm' && transactionData && (
        <div style={{ padding: '20px' }}>
          <div style={{ background: '#f5f7f6', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#0a6e3a' }}>
              {transactionData.type === 'deposit' ? '💵 Deposit' : '📤 Withdrawal'}
            </h3>
            
            <div style={{ marginBottom: '12px' }}>
              <strong>Member:</strong> {transactionData.memberName}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Phone:</strong> {transactionData.memberPhone}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Amount:</strong> ₦{transactionData.amount.toLocaleString()}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Wallet:</strong> {transactionData.walletType.charAt(0).toUpperCase() + transactionData.walletType.slice(1)}
            </div>

            {transactionData.type === 'withdraw' && (
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Enter Member's 4-Digit PIN:
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '20px',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    border: '1.5px solid #e0e0e0',
                    borderRadius: '8px'
                  }}
                />
              </div>
            )}
          </div>

          <button
            onClick={processTransaction}
            style={{
              width: '100%',
              padding: '16px',
              background: '#0a6e3a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Confirm Transaction
          </button>

          <button
            onClick={() => { setScanStep('scan'); setPin(''); }}
            style={{
              marginTop: '10px',
              width: '100%',
              padding: '14px',
              background: 'transparent',
              color: '#666',
              border: '1.5px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Scan Again
          </button>
        </div>
      )}

      {scanStep === 'processing' && (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p>Processing transaction...</p>
        </div>
      )}
    </Layout>
  );
}