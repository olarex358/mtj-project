import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function AgentDailyRoute() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);

  useEffect(() => {
    async function loadRoute() {
      // Fetch members registered by this agent who haven't saved today
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, card_qr_token')
        .eq('referred_by_agent_id', user.id)
        .eq('role', 'user');
      setMembers(data || []);
    }
    loadRoute();
  }, [user]);

  return (
    <Layout>
      <h2 style={{padding: '24px 16px 8px'}}>️ Today's Collection Route</h2>
      <p style={{padding: '0 16px', color: 'var(--muted)'}}>Members under your portfolio.</p>
      <div style={{padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
        {members.map((m, i) => (
          <div key={i} style={{background: 'white', padding: '16px', borderRadius: '12px', boxShadow: 'var(--shadow)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <strong>{m.full_name}</strong>
              <p style={{margin: 0, fontSize: '12px', color: 'var(--muted)'}}>{m.phone}</p>
            </div>
            <button onClick={() => navigator.clipboard.writeText(m.card_qr_token)} style={{background: 'var(--brand)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px'}}>
              📋 Copy QR
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
}