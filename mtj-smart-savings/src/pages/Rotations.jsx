import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/rotations.css';

export default function Rotations() {
  const { user, profile } = useAuth();
  const [myGroups, setMyGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [tab, setTab] = useState('my');

  useEffect(() => { load(); }, [user]);

  async function load() {
    // 1. Load groups I am approved in
    const { data: memberships } = await supabase
      .from('rotation_members')
      .select('rotation_id, position, join_status, rotations(*)')
      .eq('user_id', user.id);
    
    const approved = (memberships || []).filter(m => m.join_status === 'approved');
    const pending = (memberships || []).filter(m => m.join_status === 'pending');
    
    setMyGroups(approved);
    setPendingRequests(pending.map(p => p.rotation_id));

    // 2. Load all active groups (that are not full)
    const { data: all } = await supabase
      .from('rotations')
      .select('*')
      .eq('group_status', 'active')
      .order('created_at', { ascending: false });
    setAllGroups(all || []);
  }

  async function requestToJoin(rotationId) {
    // Check if already in a group (One Group Limit)
    if (myGroups.length > 0) {
      return alert('You can only be in one Esusu group at a time.');
    }
    if (pendingRequests.includes(rotationId)) {
      return alert('You have already requested to join this group.');
    }

    const { error } = await supabase.from('rotation_members').insert({
      rotation_id: rotationId,
      user_id: user.id,
      position: 0, // Assigned by admin later
      join_status: 'pending',
      requested_at: new Date().toISOString()
    });

    if (error) return alert(error.message);
    alert('✅ Request sent! The Agent/Admin will review your profile.');
    load();
  }

  return (
    <Layout>
      <h2 style={{ padding: '24px 16px 8px' }}>🔄 Smart Rotation (Esusu)</h2>
      
      {/* Trust Score Gate */}
      {(profile.trust_score || 50) < 90 && (
        <div style={{ margin: '16px', padding: '20px', background: '#fff8e1', borderLeft: '4px solid #f5a623', borderRadius: '8px' }}>
          <h3 style={{ color: '#b7791f', margin: '0 0 8px 0' }}>🔒 Esusu is Locked</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#7a5a00' }}>
            You need a <strong>Platinum Trust Score (90+)</strong> to join Esusu groups. 
            Your current score is <strong>{profile.trust_score || 50}</strong>.
          </p>
        </div>
      )}

      {(profile.trust_score || 50) >= 90 && (
        <>
          <div className="tabs">
            <button className={tab === 'my' ? 'active' : ''} onClick={() => setTab('my')}>My Groups</button>
            <button className={tab === 'browse' ? 'active' : ''} onClick={() => setTab('browse')}>Browse Groups</button>
          </div>

          {tab === 'my' && (
            <div className="group-list">
              {myGroups.length === 0 ? <p className="empty">You are not in any Esusu group yet.</p> : (
                myGroups.map(m => (
                  <div key={m.rotation_id} className="group-card">
                    <div className="group-head">
                      <h3>{m.rotations.name}</h3>
                      <span className="position">Position #{m.position}</span>
                    </div>
                    <div className="group-meta">
                      <span>₦{m.rotations.contribution_amount} / {m.rotations.frequency}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'browse' && (
            <div className="group-list">
              {allGroups.length === 0 ? <p className="empty">No active groups available.</p> : (
                allGroups.map(g => {
                  const isPending = pendingRequests.includes(g.id);
                  return (
                    <div key={g.id} className="group-card">
                      <div className="group-head"><h3>{g.name}</h3></div>
                      <div className="group-meta">
                        <span>₦{g.contribution_amount}/{g.frequency} · {g.description || 'Managed Group'}</span>
                      </div>
                      {isPending ? (
                        <button className="outline" disabled>⏳ Request Pending</button>
                      ) : (
                        <button className="outline" onClick={() => requestToJoin(g.id)}>Request to Join</button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}