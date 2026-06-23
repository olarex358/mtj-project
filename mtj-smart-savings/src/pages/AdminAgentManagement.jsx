import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

export default function AdminAgentManagement() {
  const { user } = useAuth();
  const [view, setView] = useState('agents');
  const [agents, setAgents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState({ applicant_name: '', applicant_phone: '', applicant_email: '', operating_area: '', bank_name: '', bank_account_number: '' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: agentData } = await supabase.from('profiles').select('*').eq('role', 'agent').order('created_at', { ascending: false });
    setAgents(agentData || []);
    const { data: appData } = await supabase.from('agent_applications').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    setApplications(appData || []);
  }

  async function handleRegisterAgent(e) {
    e.preventDefault();
    await supabase.from('agent_applications').insert({ ...form, status: 'pending', reviewed_by: user.id });
    alert('✅ Application submitted!');
    setForm({ applicant_name: '', applicant_phone: '', applicant_email: '', operating_area: '', bank_name: '', bank_account_number: '' });
    setView('applications');
    loadData();
  }

  async function handleApproveApplication(app) {
    const pin = prompt("Enter a 4-digit PIN for this new Agent:");
    if (!pin || !/^\d{4}$/.test(pin)) return alert("⚠️ PIN must be exactly 4 digits.");
    const email = app.applicant_email || `${app.applicant_phone.replace(/\s/g, '')}@agent.mtj.app`;
    const hiddenPassword = pin + '_mtj_secret_salt';
    const { data: authData, error: authErr } = await supabase.auth.signUp({ email: email, password: hiddenPassword });
    if (authErr) return alert('Auth Error: ' + authErr.message);
    
    await supabase.from('profiles').insert({ id: authData.user.id, full_name: app.applicant_name, phone: app.applicant_phone, role: 'agent', agent_tier: 'junior', agent_status: 'active', operating_area: app.operating_area, trust_score: 80, pin_hash: btoa(pin), card_qr_token: 'AGT-' + Math.random().toString(36).substring(2, 10).toUpperCase() });
    await supabase.from('wallets').insert(['daily', 'rotation', 'target', 'loan', 'rewards'].map(t => ({ user_id: authData.user.id, type: t })));
    await supabase.from('agent_applications').update({ status: 'approved', reviewed_by: user.id }).eq('id', app.id);
    alert(`✅ AGENT APPROVED!\nPhone: ${app.applicant_phone}\nPIN: ${pin}`);
    loadData();
  }

  async function toggleAgentStatus(agent) {
    const newStatus = agent.agent_status === 'active' ? 'suspended' : 'active';
    if(!confirm(`${newStatus === 'suspended' ? 'Suspend' : 'Activate'} ${agent.full_name}?`)) return;
    await supabase.from('profiles').update({ agent_status: newStatus }).eq('id', agent.id);
    loadData();
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#111827' }}>🤝 Agent Management</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto' }}>
        <button onClick={() => setView('agents')} style={{ background: view === 'agents' ? '#00B875' : '#F4F6F8', color: view === 'agents' ? 'white' : '#374151', border: 'none', padding: '10px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600' }}>Current Agents ({agents.length})</button>
        <button onClick={() => setView('applications')} style={{ background: view === 'applications' ? '#00B875' : '#F4F6F8', color: view === 'applications' ? 'white' : '#374151', border: 'none', padding: '10px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600' }}>Pending ({applications.length})</button>
        <button onClick={() => setView('register')} style={{ background: view === 'register' ? '#00B875' : '#F4F6F8', color: view === 'register' ? 'white' : '#374151', border: 'none', padding: '10px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600' }}>+ Register New</button>
      </div>

      {view === 'agents' && <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{agents.map(agent => (
        <div key={agent.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><strong>{agent.full_name}</strong><br/><small style={{color:'#6B7280'}}> {agent.phone} | 📍 {agent.operating_area || 'N/A'}</small><div style={{marginTop:'8px'}}><span style={{background:'#E0F2FE', color:'#0369A1', padding:'4px 8px', borderRadius:'12px', fontSize:'11px'}}>{agent.agent_tier || 'junior'}</span> <span style={{background: agent.agent_status === 'active' ? '#DCFCE7' : '#FEE2E2', color: agent.agent_status === 'active' ? '#15803D' : '#B91C1C', padding:'4px 8px', borderRadius:'12px', fontSize:'11px', marginLeft:'8px'}}>{agent.agent_status}</span></div></div>
          <button onClick={() => toggleAgentStatus(agent)} style={{ padding: '8px 12px', fontSize: '12px', color: agent.agent_status === 'active' ? '#B91C1C' : '#15803D', border: `1px solid ${agent.agent_status === 'active' ? '#B91C1C' : '#15803D'}`, background: 'white', borderRadius: '8px', cursor: 'pointer' }}>{agent.agent_status === 'active' ? '🚫 Suspend' : '✅ Activate'}</button>
        </div>
      ))}</div>}

      {view === 'applications' && <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{applications.map(app => (
        <div key={app.id} style={{ background: '#FFFBEB', padding: '16px', borderRadius: '12px', border: '1px solid #FDE68A' }}>
          <strong>{app.applicant_name}</strong> <small style={{float:'right', color:'#6B7280'}}>{new Date(app.created_at).toLocaleDateString()}</small>
          <div style={{ fontSize: '13px', color: '#4B5563', margin: '8px 0 16px 0' }}>📞 {app.applicant_phone}<br/>📍 {app.operating_area}</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => handleApproveApplication(app)} style={{ flex: 1, background: '#00B875', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>✅ Approve</button>
            <button onClick={async () => { await supabase.from('agent_applications').update({ status: 'rejected' }).eq('id', app.id); loadData(); }} style={{ flex: 1, background: 'white', color: '#B91C1C', border: '1px solid #B91C1C', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>❌ Reject</button>
          </div>
        </div>
      ))}</div>}

      {view === 'register' && <form onSubmit={handleRegisterAgent} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', background: 'white', padding: '20px', borderRadius: '12px' }}>
        <h3 style={{ margin: 0 }}>New Agent Application</h3>
        <label style={{display:'flex', flexDirection:'column', gap:'6px'}}>Full Name<input type="text" value={form.applicant_name} onChange={e => setForm({...form, applicant_name: e.target.value})} required style={{padding:'12px', border:'1px solid #D1D5DB', borderRadius:'8px'}} /></label>
        <label style={{display:'flex', flexDirection:'column', gap:'6px'}}>Phone Number<input type="tel" value={form.applicant_phone} onChange={e => setForm({...form, applicant_phone: e.target.value})} required style={{padding:'12px', border:'1px solid #D1D5DB', borderRadius:'8px'}} /></label>
        <label style={{display:'flex', flexDirection:'column', gap:'6px'}}>Operating Area<input type="text" value={form.operating_area} onChange={e => setForm({...form, operating_area: e.target.value})} required style={{padding:'12px', border:'1px solid #D1D5DB', borderRadius:'8px'}} /></label>
        <button type="submit" style={{ padding: '14px', background: '#00B875', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Submit Application</button>
      </form>}
    </div>
  );
}