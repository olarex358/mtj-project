import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import '../styles/admin.css';

export default function AdminAgentManagement() {
  const { user } = useAuth();
  const [view, setView] = useState('agents'); // 'agents', 'applications', 'register'
  const [agents, setAgents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state for new agent registration
  const [form, setForm] = useState({
    applicant_name: '',
    applicant_phone: '',
    applicant_email: '',
    operating_area: '',
    bank_name: '',
    bank_account_number: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    // 1. Load current agents
    const { data: agentData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'agent')
      .order('created_at', { ascending: false });
    setAgents(agentData || []);

    // 2. Load pending applications
    const { data: appData } = await supabase
      .from('agent_applications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setApplications(appData || []);
    
    setLoading(false);
  }

  // 1. Submit New Agent Application
  async function handleRegisterAgent(e) {
    e.preventDefault();
    const { error } = await supabase.from('agent_applications').insert({
      ...form,
      status: 'pending',
      reviewed_by: user.id
    });
    if (error) return alert('Error: ' + error.message);
    
    alert('✅ Application submitted! Go to the "Pending Approvals" tab to finalize their account.');
    setForm({ applicant_name: '', applicant_phone: '', applicant_email: '', operating_area: '', bank_name: '', bank_account_number: '' });
    setView('applications');
    loadData();
  }

  // 2. Approve Application & Create Account
  async function handleApproveApplication(app) {
    // Generate a temporary email if they didn't provide one
    const email = app.applicant_email || `${app.applicant_phone.replace(/\s/g, '')}@agent.mtj.app`;
    const tempPassword = 'MTJ' + Math.floor(100000 + Math.random() * 900000); // e.g., MTJ482199

    // Create Auth User
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: email,
      password: tempPassword,
    });

    if (authErr) {
      if (authErr.message.includes('already')) {
         return alert('⚠️ An account with this email/phone already exists.');
      }
      return alert('Auth Error: ' + authErr.message);
    }

    const newAgentId = authData.user.id;

    // Create Profile
    const { error: profileErr } = await supabase.from('profiles').insert({
      id: newAgentId,
      full_name: app.applicant_name,
      phone: app.applicant_phone,
      role: 'agent',
      agent_tier: 'junior',
      agent_status: 'active',
      operating_area: app.operating_area,
      accreditation_date: new Date().toISOString().split('T')[0],
      trust_score: 80, // Agents start with a good score
      pin_hash: btoa('0000'), // Default PIN
      card_qr_token: 'AGT-' + Math.random().toString(36).substring(2, 10).toUpperCase()
    });

    if (profileErr) return alert('Profile Error: ' + profileErr.message);

    // Create 5 Wallets for the agent (including 'rewards' for commissions)
    const walletTypes = ['daily', 'rotation', 'target', 'loan', 'rewards'];
    await supabase.from('wallets').insert(walletTypes.map(t => ({ user_id: newAgentId, type: t })));

    // Mark application as approved
    await supabase.from('agent_applications').update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    }).eq('id', app.id);

    alert(`✅ AGENT APPROVED & CREATED!\n\nEmail: ${email}\nTemp Password: ${tempPassword}\n\nPlease share these credentials securely with the agent.`);
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

  if (loading) return <div className="view-section">Loading Agent Data...</div>;

  return (
    <div className="view-section">
      <h2>🤝 Agent Management</h2>
      
      {/* Internal Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        <button onClick={() => setView('agents')} style={{ background: view === 'agents' ? 'var(--brand)' : 'transparent', color: view === 'agents' ? 'white' : 'var(--text)', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          Current Agents ({agents.length})
        </button>
        <button onClick={() => setView('applications')} style={{ background: view === 'applications' ? 'var(--brand)' : 'transparent', color: view === 'applications' ? 'white' : 'var(--text)', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          Pending Approvals ({applications.length})
        </button>
        <button onClick={() => setView('register')} style={{ background: view === 'register' ? 'var(--brand)' : 'transparent', color: view === 'register' ? 'white' : 'var(--text)', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          + Register New
        </button>
      </div>

      {/* VIEW 1: CURRENT AGENTS */}
      {view === 'agents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {agents.length === 0 && <p>No agents registered yet.</p>}
          {agents.map(agent => (
            <div key={agent.id} style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px', border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '16px' }}>{agent.full_name}</strong>
                <small style={{ color: 'var(--muted)' }}>
                  📞 {agent.phone} | 📍 {agent.operating_area || 'N/A'}
                </small>
                <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
                  <span style={{ background: '#e3f2fd', color: '#2980b9', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', textTransform: 'uppercase' }}>
                    {agent.agent_tier || 'junior'}
                  </span>
                  <span style={{ background: agent.agent_status === 'active' ? '#e8f8ef' : '#fdecea', color: agent.agent_status === 'active' ? '#27ae60' : '#c0392b', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', textTransform: 'uppercase' }}>
                    {agent.agent_status || 'active'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => toggleAgentStatus(agent)} 
                className="outline" 
                style={{ padding: '6px 12px', fontSize: '12px', color: agent.agent_status === 'active' ? 'red' : 'green', borderColor: agent.agent_status === 'active' ? 'red' : 'green' }}
              >
                {agent.agent_status === 'active' ? '🚫 Suspend' : '✅ Activate'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 2: PENDING APPLICATIONS */}
      {view === 'applications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {applications.length === 0 && <p>🎉 No pending applications.</p>}
          {applications.map(app => (
            <div key={app.id} style={{ background: '#fff8e1', padding: '16px', borderRadius: '8px', border: '1px solid #f5a623' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong>{app.applicant_name}</strong>
                <small>{new Date(app.created_at).toLocaleDateString()}</small>
              </div>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                📞 {app.applicant_phone} <br/>
                📧 {app.applicant_email || 'Will use phone@agent.mtj.app'} <br/>
                📍 {app.operating_area}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleApproveApplication(app)} style={{ flex: 1, background: '#27ae60', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  ✅ Approve & Create Account
                </button>
                <button onClick={() => handleRejectApplication(app.id)} style={{ flex: 1, background: 'white', color: 'red', border: '1px solid red', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 3: REGISTER NEW AGENT FORM */}
      {view === 'register' && (
        <form onSubmit={handleRegisterAgent} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '500px' }}>
          <h3 style={{ marginBottom: '10px', color: 'var(--brand-dark)' }}>New Agent Application</h3>
          
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px', gap: '4px' }}>
            Full Name
            <input type="text" value={form.applicant_name} onChange={e => setForm({...form, applicant_name: e.target.value})} required style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
          </label>
          
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px', gap: '4px' }}>
            Phone Number
            <input type="tel" value={form.applicant_phone} onChange={e => setForm({...form, applicant_phone: e.target.value})} required placeholder="e.g. 08012345678" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px', gap: '4px' }}>
            Email (Optional)
            <input type="email" value={form.applicant_email} onChange={e => setForm({...form, applicant_email: e.target.value})} placeholder="If empty, phone@agent.mtj.app will be used" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px', gap: '4px' }}>
            Operating Area / Address
            <input type="text" value={form.operating_area} onChange={e => setForm({...form, operating_area: e.target.value})} required placeholder="e.g. VI / Lekki Axis, Lagos" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px', gap: '4px' }}>
              Bank Name
              <input type="text" value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} placeholder="e.g. GTBank" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px', gap: '4px' }}>
              Account Number
              <input type="text" value={form.bank_account_number} onChange={e => setForm({...form, bank_account_number: e.target.value})} maxLength={10} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
            </label>
          </div>

          <button type="submit" style={{ marginTop: '10px', padding: '12px', background: 'var(--brand)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            Submit Application for Review
          </button>
        </form>
      )}
    </div>
  );
}