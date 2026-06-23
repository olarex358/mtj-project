import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import Layout from '../components/Layout';
import AdminTreasury from './AdminTreasury';
import AdminPayouts from './AdminPayouts';
import AdminCardQueue from './AdminCardQueue';
import AdminEsusuManager from './AdminEsusuManager';
import AdminAgentManagement from './AdminAgentManagement';
import AdminReconciliation from './AdminReconciliation';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('treasury');
  const [pendingPayouts, setPendingPayouts] = useState(0);
  const roleDisplay = profile?.admin_role?.toUpperCase() || 'ADMIN';

  useEffect(() => {
    if (!profile?.admin_role) return;
    fetchPendingCount();
    const channel = supabase.channel('payouts-channel').on('postgres_changes', { event: '*', schema: 'public', table: 'agent_payouts' }, fetchPendingCount).subscribe();
    return () => supabase.removeChannel(channel);
  }, [profile]);

  async function fetchPendingCount() {
    const { count } = await supabase.from('agent_payouts').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    setPendingPayouts(count || 0);
  }

  const tabs = [
    { id: 'treasury', label: '💰 Treasury', roles: ['super', 'ops'] },
    { id: 'payouts', label: ' Payouts', roles: ['super', 'ops'], badge: pendingPayouts },
    { id: 'cards', label: '🖨️ Cards', roles: ['super', 'ops', 'support'] },
    { id: 'members', label: '👥 Esusu', roles: ['super', 'ops', 'support'] },
    { id: 'agents', label: '🤝 Agents', roles: ['super', 'ops'] },
    { id: 'reconcile', label: '📊 Reconcile', roles: ['super', 'ops'] },
    { id: 'settings', label: '️ Settings', roles: ['super'] },
  ];

  const visibleTabs = tabs.filter(tab => tab.roles.includes(profile?.admin_role));

  return (
    <Layout>
      <div style={{ background: 'linear-gradient(135deg, #00B875 0%, #008F5D 100%)', padding: '24px 20px', color: 'white', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>MTJ Admin Console</h1><p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>Logged in as: {roleDisplay} ADMIN</p></div>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>{pendingPayouts} Pending</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', padding: '16px 20px', overflowX: 'auto', background: 'white', borderBottom: '1px solid #f0f0f0' }}>
        {visibleTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: activeTab === tab.id ? '#00B875' : '#F4F6F8', color: activeTab === tab.id ? 'white' : '#6B7280', border: 'none', padding: '10px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', cursor: 'pointer', position: 'relative' }}>
            {tab.label}
            {tab.badge > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#EF4444', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px', border: '2px solid white' }}>{tab.badge}</span>}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px', background: '#F4F6F8', minHeight: 'calc(100vh - 200px)' }}>
        {activeTab === 'treasury' && <AdminTreasury />}
        {activeTab === 'payouts' && <AdminPayouts />}
        {activeTab === 'cards' && <AdminCardQueue />}
        {activeTab === 'members' && <AdminEsusuManager />}
        {activeTab === 'agents' && <AdminAgentManagement />}
        {activeTab === 'reconcile' && <AdminReconciliation />}
        {activeTab === 'settings' && <div style={{ background: 'white', padding: '24px', borderRadius: '16px' }}><h2>⚙️ System Settings</h2><p style={{ color: '#EF4444' }}>🔒 Restricted to Super Admin only.</p></div>}
      </div>
    </Layout>
  );
}