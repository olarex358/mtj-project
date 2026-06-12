import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/admin.css';

export default function AdminEsusuManager() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRequests(); }, []);

  async function loadRequests() {
    // Fetch all pending requests, joining member profiles and group details
    const { data } = await supabase
      .from('rotation_members')
      .select(`
        id, 
        position, 
        requested_at,
        profiles: user_id (full_name, phone, trust_score, photo_url),
        rotations: rotation_id (name, contribution_amount, frequency)
      `)
      .eq('join_status', 'pending');
      
    setRequests(data || []);
    setLoading(false);
  }

  async function handleDecision(memberId, rotationId, decision, newPosition) {
    if (decision === 'approve') {
      await supabase.from('rotation_members').update({
        join_status: 'approved',
        position: newPosition || 1,
        approved_by: user.id,
        approved_at: new Date().toISOString()
      }).eq('user_id', memberId).eq('rotation_id', rotationId);
    } else {
      await supabase.from('rotation_members').delete().eq('user_id', memberId).eq('rotation_id', rotationId);
    }
    loadRequests();
  }

  if (loading) return <Layout><div className="loading">Loading Requests...</div></Layout>;

  return (
    <div className="view-section">
      <h2>🔄 Esusu Join Requests</h2>
      <p style={{color: 'var(--muted)', marginBottom: '20px'}}>Review and approve members requesting to join Esusu groups.</p>

      {requests.length === 0 ? (
        <p>🎉 No pending requests.</p>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          {requests.map(req => (
            <div key={req.id} style={{background: '#f9f9f9', padding: '16px', borderRadius: '8px', border: '1px solid #eee'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                <strong>{req.profiles.full_name}</strong>
                <span style={{background: '#e8f8ef', color: '#27ae60', padding: '2px 8px', borderRadius: '10px', fontSize: '12px'}}>
                  Score: {req.profiles.trust_score}
                </span>
              </div>
              <p style={{margin: '0 0 12px 0', fontSize: '13px', color: 'var(--muted)'}}>
                Wants to join: <strong>{req.rotations.name}</strong> ({req.rotations.contribution_amount}/{req.rotations.frequency})
              </p>
              <div style={{display: 'flex', gap: '8px'}}>
                <input type="number" placeholder="Assign Position #" style={{padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '120px'}} id={`pos-${req.id}`} />
                <button onClick={() => {
                  const pos = document.getElementById(`pos-${req.id}`).value;
                  handleDecision(req.user_id, req.rotation_id, 'approve', pos);
                }} style={{padding: '8px 12px', fontSize: '12px'}}>✅ Approve</button>
                <button className="outline" onClick={() => handleDecision(req.user_id, req.rotation_id, 'reject')} style={{padding: '8px 12px', fontSize: '12px', color: 'red', borderColor: 'red'}}>❌ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}