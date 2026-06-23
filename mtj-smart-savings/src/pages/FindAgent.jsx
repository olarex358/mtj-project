import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import Layout from '../components/Layout';

export default function FindAgent() {
  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAgents() {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, operating_area, agent_tier')
        .eq('role', 'agent')
        .eq('agent_status', 'active');
      setAgents(data || []);
      setLoading(false);
    }
    loadAgents();
  }, []);

  const filtered = agents.filter(a => 
    a.full_name.toLowerCase().includes(search.toLowerCase()) || 
    (a.operating_area && a.operating_area.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Layout>
      <div style={{ padding: '24px 20px' }}>
        <h1 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '22px' }}>📍 Find an MTJ Agent</h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '24px' }}>Visit any of these verified agents to fund your account with cash.</p>
        
        <input 
          type="text" 
          placeholder="Search by name or area (e.g. Lekki)" 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '15px', marginBottom: '20px', boxSizing: 'border-box' }}
        />

        {loading ? (
          <p style={{ textAlign: 'center', color: '#6B7280' }}>Loading agents...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.length === 0 && <p style={{textAlign: 'center', color: '#6B7280'}}>No agents found in this area.</p>}
            {filtered.map((agent, index) => (
              <div key={index} style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ color: '#111827', fontSize: '15px' }}>{agent.full_name}</strong>
                  <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '4px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
                    {agent.agent_tier || 'junior'}
                  </span>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6B7280' }}>📍 {agent.operating_area || 'General Area'}</p>
                <a href={`tel:${agent.phone}`} style={{ textDecoration: 'none' }}>
                  <button style={{ width: '100%', background: '#00B875', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                    📞 Call {agent.phone}
                  </button>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}