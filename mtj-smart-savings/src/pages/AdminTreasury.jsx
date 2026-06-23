import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function AdminTreasury() {
  const [stats, setStats] = useState({ members: 0, agents: 0, totalBalance: 0 });

  useEffect(() => {
    async function load() {
      const { count: members } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user');
      const { count: agents } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'agent');
      
      const { data: wallets } = await supabase.from('wallets').select('id');
      let total = 0;
      // Note: In a real app, we'd use a DB function for this. For now, we just show member count.
      
      setStats({ members: members || 0, agents: agents || 0, totalBalance: total });
    }
    load();
  }, []);

  function downloadCSV() {
    alert("📊 CSV Export feature is ready to be connected to your backend reporting tool.");
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#111827', fontSize: '20px' }}>💰 Treasury Overview</h2>
        <button onClick={downloadCSV} style={{ padding: '8px 16px', background: 'white', color: '#00B875', border: '1px solid #00B875', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
           Download Report
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <small style={{ color: '#6B7280', fontSize: '12px', fontWeight: '600' }}>ACTIVE MEMBERS</small>
          <h3 style={{ margin: '8px 0 0 0', color: '#00B875', fontSize: '28px' }}>{stats.members}</h3>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <small style={{ color: '#6B7280', fontSize: '12px', fontWeight: '600' }}>ACTIVE AGENTS</small>
          <h3 style={{ margin: '8px 0 0 0', color: '#3B82F6', fontSize: '28px' }}>{stats.agents}</h3>
        </div>
      </div>
    </div>
  );
}