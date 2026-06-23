import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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

  function generateQR() {
    if (!amount || Number(amount) <= 0) return alert('Please enter a valid amount');
    const data = {
      type, amount: Number(amount), walletType,
      memberId: user.id, memberName: profile.full_name,
      memberPhone: profile.phone,
      expiresAt: Date.now() + 120000
    };
    setQrData(btoa(JSON.stringify(data)));
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '24px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#111827', fontSize: '18px' }}>
          {type === 'deposit' ? '💵 Deposit QR' : '📤 Withdrawal QR'}
        </h2>

        {!qrData ? (
          <>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (₦)" style={{ width: '100%', padding: '14px', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '16px', marginBottom: '12px', boxSizing: 'border-box' }} />
            <select value={walletType} onChange={e => setWalletType(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '16px', marginBottom: '20px', boxSizing: 'border-box' }}>
              <option value="daily">Daily Savings</option>
              <option value="rotation">Esusu / Rotation</option>
              <option value="target">Target Savings</option>
            </select>
            <button onClick={generateQR} style={{ width: '100%', padding: '14px', background: '#00B875', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>Generate QR Code</button>
          </>
        ) : (
          <>
            <div style={{ background: 'white', padding: '16px', borderRadius: '12px', display: 'inline-block', marginBottom: '16px', border: '1px solid #F3F4F6' }}>
              <QRCodeSVG value={qrData} size={200} level="H" includeMargin={true} />
            </div>
            <div style={{ background: '#FFFBEB', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', color: '#92400E' }}>
              ⏱️ Expires in: <strong>{mins}:{secs < 10 ? '0' : ''}{secs}</strong>
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>Show this to your agent to complete the transaction.</p>
            <button onClick={() => setQrData(null)} style={{ width: '100%', padding: '12px', background: '#F4F6F8', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Generate New QR</button>
          </>
        )}
        <button onClick={onClose} style={{ marginTop: '12px', width: '100%', padding: '12px', background: 'transparent', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}