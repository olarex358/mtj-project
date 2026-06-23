import { useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

export default function AdminReconciliation() {
  const { user } = useAuth();
  const [bankBalance, setBankBalance] = useState('');
  const [result, setResult] = useState(null);

  async function runCheck() {
    // In a real app, this would sum all wallet balances via a DB function
    const appBalance = 0; // Placeholder for DB function
    const actual = Number(bankBalance);
    const diff = appBalance - actual;

    await supabase.from('reconciliation_logs').insert({
      app_ledger_balance: appBalance, opay_actual_balance: actual,
      difference: diff, status: diff === 0 ? 'matched' : 'mismatch', checked_by: user.id
    });

    setResult({ appBalance, actual, diff, status: diff === 0 ? 'matched' : 'mismatch' });
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#111827', fontSize: '20px' }}>📊 Daily Reconciliation</h2>
      <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <label style={{ display: 'block', marginBottom: '16px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
          Enter Actual OPay Bank Balance (₦)
          <input type="number" value={bankBalance} onChange={e => setBankBalance(e.target.value)} style={{ width: '100%', padding: '12px', marginTop: '8px', border: '1px solid #E5E7EB', borderRadius: '8px', boxSizing: 'border-box' }} />
        </label>
        <button onClick={runCheck} style={{ width: '100%', padding: '14px', background: '#00B875', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>Run Check</button>
        
        {result && (
          <div style={{ marginTop: '20px', padding: '16px', background: result.status === 'matched' ? '#F0FDF4' : '#FEF2F2', borderRadius: '10px', border: `1px solid ${result.status === 'matched' ? '#86EFAC' : '#FECACA'}` }}>
            <h3 style={{ margin: '0 0 8px 0', color: result.status === 'matched' ? '#15803D' : '#B91C1C' }}>Status: {result.status.toUpperCase()}</h3>
            <p style={{ margin: '4px 0', fontSize: '14px', color: '#4B5563' }}>App Ledger: {result.appBalance.toLocaleString()}</p>
            <p style={{ margin: '4px 0', fontSize: '14px', color: '#4B5563' }}>Bank Actual: ₦{result.actual.toLocaleString()}</p>
            <p style={{ margin: '4px 0', fontSize: '14px', fontWeight: 'bold', color: '#4B5563' }}>Difference: {result.diff.toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}