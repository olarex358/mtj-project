import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function AgentScanQR() {
  const { user } = useAuth();
  const [step, setStep] = useState('scan'); // scan, confirm, processing
  const [txnData, setTxnData] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    if (step === 'scan') {
      const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } });
      scanner.render(onSuccess, () => {});
      scannerRef.current = scanner;
    }
    return () => { if (scannerRef.current) scannerRef.current.clear().catch(() => {}); };
  }, [step]);

  async function onSuccess(decodedText) {
    try {
      const data = JSON.parse(atob(decodedText));
      if (Date.now() > data.expiresAt) return setError('QR Code expired. Ask member to generate a new one.');
      setTxnData(data);
      setStep('confirm');
    } catch (e) { setError('Invalid QR Code'); }
  }

  async function processTransaction() {
    setError('');
    setStep('processing');
    try {
      if (txnData.type === 'withdraw') {
        const { data: prof } = await supabase.from('profiles').select('pin_hash').eq('id', txnData.memberId).single();
        if (btoa(pin) !== prof.pin_hash) { setError('Incorrect Member PIN'); setStep('confirm'); return; }
      }

      // 1. Get Wallet
      const { data: wallet } = await supabase.from('wallets').select('id, balance').eq('user_id', txnData.memberId).eq('type', txnData.walletType).single();
      if (!wallet) throw new Error('Wallet not found');
      if (txnData.type === 'withdraw' && wallet.balance < txnData.amount) throw new Error('Insufficient funds');

      // 2. Update Wallet Balance
      const newBalance = txnData.type === 'deposit' ? Number(wallet.balance) + txnData.amount : Number(wallet.balance) - txnData.amount;
      await supabase.from('wallets').update({ balance: newBalance }).eq('id', wallet.id);

      // 3. Record Ledger
      await supabase.from('ledger_entries').insert({
        user_id: txnData.memberId, agent_id: user.id, wallet_id: wallet.id,
        type: txnData.type, amount: txnData.amount, direction: txnData.type === 'deposit' ? 'credit' : 'debit',
        reference: txnData.memberId, note: `${txnData.type} via QR Scan`
      });

      // 4. Update Agent Float (Optional but good for tracking)
      if (txnData.type === 'deposit') {
        await supabase.rpc('increment_agent_float', { agent_id: user.id, amount: txnData.amount }).catch(() => {});
      }

      setStep('success');
    } catch (err) { setError(err.message); setStep('confirm'); }
  }

  return (
    <Layout>
      <div style={{ padding: '24px 20px' }}>
        <h1 style={{ margin: '0 0 20px 0', color: '#111827', fontSize: '22px' }}>📷 Scan Member QR</h1>
        
        {error && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}

        {step === 'scan' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#6B7280', marginBottom: '20px' }}>Point camera at member's screen</p>
            <div id="qr-reader" style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}></div>
          </div>
        )}

        {step === 'confirm' && txnData && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h2 style={{ margin: '0 0 16px 0', color: '#00B875', fontSize: '20px' }}>Confirm Transaction</h2>
            <div style={{ marginBottom: '12px', fontSize: '14px' }}><strong>Member:</strong> {txnData.memberName}</div>
            <div style={{ marginBottom: '12px', fontSize: '14px' }}><strong>Amount:</strong> ₦{txnData.amount.toLocaleString()}</div>
            <div style={{ marginBottom: '12px', fontSize: '14px' }}><strong>Type:</strong> {txnData.type === 'deposit' ? '💵 Deposit' : '📤 Withdrawal'}</div>
            <div style={{ marginBottom: '20px', fontSize: '14px' }}><strong>Wallet:</strong> {txnData.walletType}</div>
            
            {txnData.type === 'withdraw' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>Member PIN</label>
                <input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '20px', letterSpacing: '8px', textAlign: 'center', boxSizing: 'border-box' }} />
              </div>
            )}

            <button onClick={processTransaction} style={{ width: '100%', padding: '14px', background: '#00B875', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>Confirm & Process</button>
            <button onClick={() => { setStep('scan'); setPin(''); setError(''); }} style={{ width: '100%', padding: '12px', background: 'transparent', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '10px' }}>Cancel</button>
          </div>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ color: '#00B875', marginBottom: '8px' }}>Transaction Successful!</h2>
            <p style={{ color: '#6B7280', marginBottom: '24px' }}>₦{txnData.amount.toLocaleString()} {txnData.type === 'deposit' ? 'credited to' : 'debited from'} {txnData.memberName}.</p>
            <button onClick={() => { setStep('scan'); setTxnData(null); setPin(''); }} style={{ padding: '14px 24px', background: '#00B875', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>Scan Next Member</button>
          </div>
        )}
      </div>
    </Layout>
  );
}