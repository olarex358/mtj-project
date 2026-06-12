import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function AdminReconciliation() {
  const { user } = useAuth();
  const [opayBalance, setOpayBalance] = useState('');
  const [result, setResult] = useState(null);

  async function runReconciliation() {
    // 1. Calculate App Ledger Balance (Sum of all wallet balances)
    const { data: wallets } = await supabase.from('wallets').select('id');
    let appBalance = 0;
    for (const w of wallets) {
      const { data } = await supabase.rpc('wallet_balance', { p_wallet_id: w.id });
      appBalance += Number(data || 0);
    }

    const actual = Number(opayBalance);
    const diff = appBalance - actual;

    // 2. Log it
    await supabase.from('reconciliation_logs').insert({
      app_ledger_balance: appBalance, opay_actual_balance: actual,
      difference: diff, status: diff === 0 ? 'matched' : 'mismatch', checked_by: user.id
    });

    setResult({ appBalance, actual, diff, status: diff === 0 ? 'matched' : 'mismatch' });
  }

  return (
    <div className="view-section">
      <h2> Daily Reconciliation</h2>
      <p>Compare App Ledger vs Actual OPay Business Account.</p>
      <label style={{display: 'block', margin: '16px 0'}}>
        Enter Actual OPay Balance (₦):
        <input type="number" value={opayBalance} onChange={e => setOpayBalance(e.target.value)} style={{width: '100%', padding: '10px', marginTop: '5px'}} />
      </label>
      <button onClick={runReconciliation}>Run Reconciliation Check</button>
      
      {result && (
        <div style={{marginTop: '20px', padding: '16px', background: result.status === 'matched' ? '#e8f8ef' : '#fdecea', borderRadius: '8px'}}>
          <h3 style={{color: result.status === 'matched' ? '#27ae60' : '#c0392b'}}>
            Status: {result.status.toUpperCase()}
          </h3>
          <p>App Ledger: ₦{result.appBalance.toLocaleString()}</p>
          <p>OPay Actual: ₦{result.actual.toLocaleString()}</p>
          <p>Difference: ₦{result.diff.toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}