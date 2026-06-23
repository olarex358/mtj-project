import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function Rotations() {
  const { user, profile } = useAuth();
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);

  useEffect(() => {
    async function load() {
      const { data: allGroups } = await supabase.from('rotations').select('*').eq('is_active', true);
      const { data: myMem } = await supabase.from('rotation_members').select('rotation_id').eq('user_id', user.id);
      setGroups(allGroups || []);
      setMyGroups(myMem ? myMem.map(m => m.rotation_id) : []);
    }
    load();
  }, [user]);

  async function joinGroup(groupId) {
    if ((profile?.trust_score || 50) < 90) return alert('You need a Trust Score of 90+ to join Esusu groups.');
    await supabase.from('rotation_members').insert({ rotation_id: groupId, user_id: user.id, status: 'pending' });
    alert('✅ Request sent to Admin/Agent for approval!');
  }

  return (
    <Layout>
      <div style={{ padding: '24px 20px' }}>
        <h1 style={{ margin: '0 0 20px 0', color: '#111827', fontSize: '22px' }}>🔄 Esusu Rotations</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {groups.map(g => (
            <div key={g.id} style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, color: '#111827', fontSize: '16px' }}>{g.name}</h3>
                <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>{g.frequency}</span>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6B7280' }}>Contribution: <strong>₦{Number(g.contribution_amount).toLocaleString()}</strong> · Members: {g.member_count}</p>
              <button 
                onClick={() => joinGroup(g.id)} 
                disabled={myGroups.includes(g.id)}
                style={{ width: '100%', padding: '10px', background: myGroups.includes(g.id) ? '#F4F6F8' : '#00B875', color: myGroups.includes(g.id) ? '#6B7280' : 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: myGroups.includes(g.id) ? 'default' : 'pointer' }}
              >
                {myGroups.includes(g.id) ? '✅ Request Sent' : 'Request to Join'}
              </button>
            </div>
          ))}
          {groups.length === 0 && <p style={{textAlign: 'center', color: '#6B7280', marginTop: '40px'}}>No active Esusu groups right now.</p>}
        </div>
      </div>
    </Layout>
  );
}