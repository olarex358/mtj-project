import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function KYCUpgrade() {
  const { user } = useAuth();
  const [tier, setTier] = useState('tier2');
  const [idNumber, setIdNumber] = useState('');

  async function handleUpgrade() {
    // In a real app, this would call Dojah/SmileID API via Supabase Edge Function
    alert('🚧 KYC Verification API Integration Required. For now, marking as pending.');
    await supabase.from('profiles').update({ kyc_tier_status: tier + '_pending' }).eq('id', user.id);
  }

  return (
    <Layout>
      <h2 style={{padding: '24px 16px 8px'}}>🆔 Upgrade KYC Tier</h2>
      <div className="card-form" style={{margin: 16}}>
        <label>Select Tier
          <select value={tier} onChange={e => setTier(e.target.value)}>
            <option value="tier2">Tier 2 (NIN Verification) - Limit ₦500k</option>
            <option value="tier3">Tier 3 (BVN Verification) - Limit ₦5M+</option>
          </select>
        </label>
        <label>{tier === 'tier2' ? 'NIN' : 'BVN'} Number
          <input value={idNumber} onChange={e => setIdNumber(e.target.value)} maxLength={11} />
        </label>
        <button onClick={handleUpgrade}>Submit for Verification</button>
      </div>
    </Layout>
  );
}