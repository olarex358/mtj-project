import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/admin.css';

export default function AdminPayouts() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRequests(); }, []);

  async function loadRequests() {
    const { data } = await supabase
      .from('agent_payouts')
      .select('*, profiles(full_name, phone)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  }

  // Generate OPay Deep Link for Admin to send money
  function getOPayLink(phone, amount) {
    return `https://openapp.opaymobile.com/opayweb/#/transfer?phone=${phone}&amount=${amount}&note=MTJ+Agent+Payout`;
  }

  async function handleApprove(payoutId, phone, amount) {
    if (!window.confirm(`Are you sure you want to send ₦${amount} to ${phone}? Open OPay now.`)) return;

    // 1. Open OPay App
    window.open(getOPayLink(phone, amount), '_blank');

    // 2. Ask Admin to confirm once sent
    setTimeout(async () => {
      const confirmed = window.confirm("Have you successfully sent the money in OPay?");
      if (confirmed) {
        await supabase.from('agent_payouts').update({
          status: 'completed',
          approved_by: user.id,
          completed_at: new Date().toISOString()
        }).eq('id', payoutId);
        loadRequests();
        alert('✅ Payout marked as completed!');
      }
    }, 2000);
  }

  async function handleReject(payoutId) {
    if (!window.confirm("Reject this payout request?")) return;
    await supabase.from('agent_payouts').update({ status: 'rejected' }).eq('id', payoutId);
    loadRequests();
  }

  if (loading) return <Layout><div className="loading">Loading Payouts...</div></Layout>;

  return (
    <div className="view-section">
      <h2>💸 Payout Approvals</h2>
      <p style={{color: 'var(--muted)', marginBottom: '20px'}}>Review and approve agent withdrawal requests.</p>

      {requests.length === 0 ? (
        <p>🎉 No pending payout requests.</p>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          {requests.map(req => (
            <div key={req.id} style={{background: '#f9f9f9', padding: '16px', borderRadius: '8px', border: '1px solid #eee'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                <strong>{req.profiles?.full_name}</strong>
                <span style={{fontWeight: 'bold', color: 'var(--brand)'}}>₦{Number(req.amount).toLocaleString()}</span>
              </div>
              <div style={{fontSize: '13px', color: '#666', marginBottom: '12px'}}>
                📞 {req.profiles?.phone || 'No Phone'} <br/>
                 Requested: {new Date(req.created_at).toLocaleDateString()}
              </div>
              <div style={{display: 'flex', gap: '8px'}}>
                <button 
                  onClick={() => handleApprove(req.id, req.profiles?.phone || req.opay_phone, req.amount)} 
                  style={{flex: 1, background: '#27ae60'}}
                >
                  ✅ Approve & Send (OPay)
                </button>
                <button 
                  className="outline" 
                  onClick={() => handleReject(req.id)} 
                  style={{color: 'red', borderColor: 'red'}}
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}