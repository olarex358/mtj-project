import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

export default function AdminPayouts() {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('agent_payouts').select('*, profiles(full_name, phone)').eq('status', 'pending').order('created_at', { ascending: false });
    setPayouts(data || []);
  }

  async function updateStatus(id, status) {
    await supabase.from('agent_payouts').update({ status, reviewed_by: user.id }).eq('id', id);
    load();
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#111827', fontSize: '20px' }}>💸 Pending Agent Payouts</h2>
      {payouts.length === 0 && <p style={{textAlign: 'center', color: '#6B7280', marginTop: '40px'}}>🎉 No pending payouts.</p>}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {payouts.map(p => (
          <div key={p.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong style={{color: '#111827'}}>{p.profiles?.full_name || 'Unknown Agent'}</strong>
              <strong style={{color: '#00B875', fontSize: '16px'}}>₦{Number(p.amount).toLocaleString()}</strong>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6B7280' }}>OPay Phone: <strong>{p.opay_phone}</strong></p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => updateStatus(p.id, 'approved')} style={{ flex: 1, padding: '10px', background: '#00B875', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>✅ Approve</button>
              <button onClick={() => updateStatus(p.id, 'rejected')} style={{ flex: 1, padding: '10px', background: 'white', color: '#EF4444', border: '1px solid #EF4444', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>❌ Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}