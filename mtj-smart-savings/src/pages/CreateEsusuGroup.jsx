import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function CreateEsusuGroup() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '', contribution_amount: '', frequency: 'weekly', member_count: 10,
    payout_method: 'sequential', insurance_holdback_pct: 5
  });

  async function handleSubmit(e) {
    e.preventDefault();
    const { error } = await supabase.from('rotations').insert({
      ...form,
      created_by_agent_id: user.id,
      contribution_amount: Number(form.contribution_amount),
      member_count: Number(form.member_count),
      insurance_holdback_pct: Number(form.insurance_holdback_pct)
    });
    if (error) return alert(error.message);
    alert('✅ Group Created! It will vanish from the browse list once full.');
  }

  return (
    <Layout>
      <h2 style={{padding: '24px 16px 8px'}}> Create Esusu Group</h2>
      <form onSubmit={handleSubmit} className="card-form" style={{margin: 16}}>
        <label>Group Name<input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></label>
        <label>Contribution (₦)<input type="number" value={form.contribution_amount} onChange={e => setForm({...form, contribution_amount: e.target.value})} required /></label>
        <label>Frequency
          <select value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})}>
            <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
          </select>
        </label>
        <label>Max Members<input type="number" value={form.member_count} onChange={e => setForm({...form, member_count: e.target.value})} min={3} max={50} required /></label>
        
        <label>Payout Method
          <select value={form.payout_method} onChange={e => setForm({...form, payout_method: e.target.value})}>
            <option value="sequential">Sequential (First-come, first-served)</option>
            <option value="random">Random Lottery</option>
            <option value="admin_assigned">Admin Assigned</option>
          </select>
        </label>
        
        <label>Insurance Holdback (%)
          <input type="number" value={form.insurance_holdback_pct} onChange={e => setForm({...form, insurance_holdback_pct: e.target.value})} min={0} max={20} />
          <small style={{color: 'var(--muted)'}}>Held back from lump-sum payout as security deposit.</small>
        </label>

        <button type="submit">Create Group</button>
      </form>
    </Layout>
  );
}