import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

export default function TransactionQR({ type, onClose }) {
  const { user, profile } = useAuth();
  const [amount, setAmount] = useState('');
  const [walletType, setWalletType] = useState('daily');
  const [qrData, setQrData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes

  useEffect(() => {
    if (timeLeft > 0 && qrData) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setQrData(null);
    }
  }, [timeLeft, qrData]);

  async function generateQR() {
    if (!amount || Number(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const transactionData = {
      type: type, // 'deposit' or 'withdraw'
      amount: Number(amount),
      walletType: walletType,
      memberId: user.id,
      memberName: profile.full_name,
      memberPhone: profile.phone,
      timestamp: Date.now(),
      expiresAt: Date.now() + (120 * 1000) // 2 minutes
    };

    // Encrypt the data (simple base64 for now)
    const encoded = btoa(JSON.stringify(transactionData));
    setQrData(encoded);
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#0a6e3a' }}>
          {type === 'deposit' ? '💵 Generate Deposit QR' : '📤 Generate Withdrawal QR'}
        </h2>

        {!qrData ? (
          <>
            <label style={{ display: 'block', marginBottom: '16px', textAlign: 'left' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                Amount (₦)
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 1000"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1.5px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: '20px', textAlign: 'left' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                Wallet Type
              </span>
              <select
                value={walletType}
                onChange={(e) => setWalletType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1.5px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="daily">Daily Savings</option>
                <option value="rotation">Rotation (Esusu)</option>
                <option value="target">Target Savings</option>
              </select>
            </label>

            <button
              onClick={generateQR}
              style={{
                width: '100%',
                padding: '14px',
                background: '#0a6e3a',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Generate QR Code
            </button>
          </>
        ) : (
          <>
            <div style={{
              background: 'white',
              padding: '16px',
              borderRadius: '12px',
              display: 'inline-block',
              marginBottom: '16px'
            }}>
              <QRCodeSVG
                value={qrData}
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>

            <div style={{
              background: '#fff8e1',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#b7791f' }}>
                ⏱️ QR expires in: <strong>{minutes}:{seconds < 10 ? '0' : ''}{seconds}</strong>
              </p>
            </div>

            <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
              Show this QR code to your agent to complete the {type}
            </p>

            <button
              onClick={() => setQrData(null)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#f5f5f5',
                color: '#333',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Generate New QR
            </button>
          </>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: '16px',
            width: '100%',
            padding: '12px',
            background: 'transparent',
            color: '#666',
            border: '1.5px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}