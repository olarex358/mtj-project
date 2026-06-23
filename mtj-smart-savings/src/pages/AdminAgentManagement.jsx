import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

export default function AdminAgentManagement() {
  const { user } = useAuth();
  const [view, setView] = useState('agents');
  const [agents, setAgents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [form, setForm] = useState({
    applicant_name: '', applicant_phone: '', applicant_email: '',
    operating_area: '', bank_name: '', bank_account_number: ''
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: agentData } = await supabase.from('profiles').select('*').eq('role', 'agent').order('created_at', { ascending: false });
    setAgents(agentData || []);

    const { data: appData } = await supabase.from('agent_applications').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    setApplications(appData || []);
    setLoading(false);
  }

  async function handleRegisterAgent(e) {
    e.preventDefault();
    const { error } = await supabase.from('agent_applications').insert({ ...form, status: 'pending', reviewed_by: user.id });
    if (error) return alert('Error: ' + error.message);
    alert('✅ Application submitted! Go to the "Pending Approvals" tab to finalize their account.');
    setForm({ applicant_name: '', applicant_phone: '', applicant_email: '', operating_area: '', bank_name: '', bank_account_number: '' });
    setView('applications');
    loadData();
  }

  // NEW: Approve Application & Create Account with PIN
  async function handleApproveApplication(app) {
    const pin = prompt("Enter a 4-digit PIN for this new Agent:");
    if (!pin || !/^\d{4}$/.test(pin)) {
      return alert("⚠️ PIN must be exactly 4 digits. Please try again.");
    }

    const email = app.applicant_email || `${app.applicant_phone.replace(/\s/g, '')}@agent.mtj.app`;
    const hiddenPassword = pin + '_mtj_secret_salt';

    const { data: authData, error: authErr } = await supabase.auth.signUp({ email: email, password: hiddenPassword });

    if (authErr) {
      if (authErr.message.includes('already')) return alert('⚠️ An account with this email/phone already exists.');
      return alert('Auth Error: ' + authErr.message);
    }

    const newAgentId = authData.user.id;

    const { error: profileErr } = await supabase.from('profiles').insert({
      id: newAgentId, full_name: app.applicant_name, phone: app.applicant_phone,
      role: 'agent', agent_tier: 'junior', agent_status: 'active',
      operating_area: app.operating_area, accreditation_date: new Date().toISOString().split('T')[0],
      trust_score: 80, pin_hash: btoa(pin), // Store the 4-digit PIN
      card_qr_token: 'AGT-' + Math.random().toString(36).substring(2, 10).toUpperCase()
    });

    if (profileErr) return alert('Profile Error: ' + profileErr.message);

    const walletTypes = ['daily', 'rotation', 'target', 'loan', 'rewards'];
    await supabase.from('wallets').insert(walletTypes.map(t => ({ user_id: newAgentId, type: t })));

    await supabase.from('agent_applications').update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', app.id);

    alert(`✅ AGENT APPROVED & CREATED!\n\nLogin Phone: ${app.applicant_phone}\nPIN: ${pin}\n\nPlease share these credentials securely with the agent.`);
    loadData();
  }

  async function handleRejectApplication(appId) {
    if(!confirm('Reject this application?')) return;
    await supabase.from('agent_applications').update({ status: 'rejected', reviewed_by: user.id }).eq('id', appId);
    loadData();
  }

  async function toggleAgentStatus(agent) {
    const newStatus = agent.agent_status === 'active' ? 'suspended' : 'active';
    if(!confirm(`${newStatus === 'suspended' ? 'Suspend' : 'Activate'} ${agent.full_name}?`)) return;
    await supabase.from('profiles').update({ agent_status: newStatus }).eq('id', agent.id);
    loadData();
  }

  if (loading) return <div style={{padding: '20px', textAlign: 'center'}}>Loading Agent Data...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#111827' }}>🤝 Agent Management</h2>
      
      {/* Internal Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px', overflowX: 'auto' }}>
        <button onClick={() => setView('agents')} style={{ background: view === 'agents' ? '#00B875' : '#F4F6F8', color: view === 'agents' ? 'white' : '#374151', border: 'none', padding: '10px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
          Current Agents ({agents.length})
        </button>
        <button onClick={() => setView('applications')} style={{ background: view === 'applications' ? '#00B875' : '#F4F6F8', color: view === 'applications' ? 'white' : '#374151', border: 'none', padding: '10px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
          Pending Approvals ({applications.length})
        </button>
        <button onClick={() => setView('register')} style={{ background: view === 'register' ? '#00B875' : '#F4F6F8', color: view === 'register' ? 'white' : '#374151', border: 'none', padding: '10px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
          + Register New
        </button>
      </div>

      {/* VIEW 1: CURRENT AGENTS */}
      {view === 'agents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {agents.length === 0 && <p style={{color: '#6B7280'}}>No agents registered yet.</p>}
          {agents.map(agent => (
            <div key={agent.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '15px', color: '#111827' }}>{agent.full_name}</strong>
                <small style={{ color: '#6B7280' }}>📞 {agent.phone} | 📍 {agent.operating_area || 'N/A'}</small>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>{agent.agent_tier || 'junior'}</span>
                  <span style={{ background: agent.agent_status === 'active' ? '#DCFCE7' : '#FEE2E2', color: agent.agent_status === 'active' ? '#15803D' : '#B91C1C', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>{agent.agent_status || 'active'}</span>
                </div>
              </div>
              <button onClick={() => toggleAgentStatus(agent)} style={{ padding: '8px 12px', fontSize: '12px', color: agent.agent_status === 'active' ? '#B91C1C' : '#15803D', border: `1px solid ${agent.agent_status === 'active' ? '#B91C1C' : '#15803D'}`, background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                {agent.agent_status === 'active' ? '🚫 Suspend' : '✅ Activate'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 2: PENDING APPLICATIONS */}
      {view === 'applications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {applications.length === 0 && <p style={{color: '#6B7280'}}>🎉 No pending applications.</p>}
          {applications.map(app => (
            <div key={app.id} style={{ background: '#FFFBEB', padding: '16px', borderRadius: '12px', border: '1px solid #FDE68A' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong style={{color: '#111827'}}>{app.applicant_name}</strong>
                <small style={{color: '#6B7280'}}>{new Date(app.created_at).toLocaleDateString()}</small>
              </div>
              <div style={{ fontSize: '13px', color: '#4B5563', marginBottom: '16px' }}>
                📞 {app.applicant_phone} <br/>
                📧 {app.applicant_email || 'Will use phone@agent.mtj.app'} <br/>
                📍 {app.operating_area}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleApproveApplication(app)} style={{ flex: 1, background: '#00B875', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                  ✅ Approve & Create Account
                </button>
                <button onClick={() => handleRejectApplication(app.id)} style={{ flex: 1, background: 'white', color: '#B91C1C', border: '1px solid #B91C1C', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 3: REGISTER NEW AGENT FORM */}
      {view === 'register' && (
        <form onSubmit={handleRegisterAgent} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: 0, color: '#111827' }}>New Agent Application</h3>
          
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px', gap: '6px', color: '#374151', fontWeight: '500' }}>
            Full Name
            <input type="text" value={form.applicant_name} onChange={e => setForm({...form, applicant_name: e.target.value})} required style={{ padding: '12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }} />
          </label>
          
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px', gap: '6px', color: '#374151', fontWeight: '500' }}>
            Phone Number
            <input type="tel" value={form.applicant_phone} onChange={e => setForm({...form, applicant_phone: e.target.value})} required placeholder="e.g. 08012345678" style={{ padding: '12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px', gap: '6px', color: '#374151', fontWeight: '500' }}>
            Email (Optional)
            <input type="email" value={form.applicant_email} onChange={e => setForm({...form, applicant_email: e.target.value})} placeholder="If empty, phone@agent.mtj.app will be used" style={{ padding: '12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px', gap: '6px', color: '#374151', fontWeight: '500' }}>
            Operating Area / Address
            <input type="text" value={form.operating_area} onChange={e => setForm({...form, operating_area: e.target.value})} required placeholder="e.g. VI / Lekki Axis, Lagos" style={{ padding: '12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px', gap: '6px', color: '#374151', fontWeight: '500' }}>
              Bank Name
              <input type="text" value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} placeholder="e.g. GTBank" style={{ padding: '12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px', gap: '6px', color: '#374151', fontWeight: '500' }}>
              Account Number
              <input type="text" value={form.bank_account_number} onChange={e => setForm({...form, bank_account_number: e.target.value})} maxLength={10} style={{ padding: '12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }} />
            </label>
          </div>

          <button type="submit" style={{ marginTop: '10px', padding: '14px', background: '#00B875', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}>
            Submit Application for Review
          </button>
        </form>
      )}
    </div>
  );
}