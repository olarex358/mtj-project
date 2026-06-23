import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function AdminEsusuManager() {
  const [groups, setGroups] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('rotations').select('*').order('created_at', { ascending: false });
    setGroups(data || []);
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#111827', fontSize: '20px' }}>🔄 Active Esusu Groups</h2>
      {groups.length === 0 && <p style={{textAlign: 'center', color: '#6B7280', marginTop: '40px'}}>No Esusu groups created yet.</p>}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {groups.map(g => (
          <div key={g.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong style={{color: '#111827', fontSize: '15px'}}>{g.name}</strong>
              <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>{g.frequency}</span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>Contribution: ₦{Number(g.contribution_amount).toLocaleString()} · Members: {g.member_count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}