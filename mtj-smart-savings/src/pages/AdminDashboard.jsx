import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import Layout from '../components/Layout';
import '../styles/admin.css';

import AdminTreasury from './AdminTreasury';
import AdminPayouts from './AdminPayouts';
import AdminCardQueue from './AdminCardQueue';
import AdminEsusuManager from './AdminEsusuManager';
import AdminAgentManagement from './AdminAgentManagement';
import AdminReconciliation from './AdminReconciliation';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('treasury');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingPayouts, setPendingPayouts] = useState(0);

  // PRO FIX: Null-safety to prevent crashes
  const roleDisplay = profile?.admin_role?.toUpperCase() || 'ADMIN';

  // PRO FEATURE 1: Real-Time Notification Badges
  useEffect(() => {
    if (profile?.admin_role !== 'super' && profile?.admin_role !== 'ops') return;

    // Initial fetch
    fetchPendingCount();

    // Listen for real-time changes
    const channel = supabase
      .channel('payouts-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_payouts' }, () => {
        fetchPendingCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  async function fetchPendingCount() {
    const { count } = await supabase
      .from('agent_payouts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setPendingPayouts(count || 0);
  }

  const tabs = [
    { id: 'treasury', label: '💰 Treasury', roles: ['super', 'ops'] },
    { id: 'payouts', label: '💸 Payouts', roles: ['super', 'ops'], badge: pendingPayouts },
    { id: 'cards', label: '🖨️ Cards', roles: ['super', 'ops', 'support'] },
    { id: 'members', label: '👥 Esusu', roles: ['super', 'ops', 'support'] },
    { id: 'agents', label: ' Agents', roles: ['super', 'ops'] },
    { id: 'reconcile', label: '📊 Reconcile', roles: ['super', 'ops'] },
    { id: 'settings', label: '⚙️ Settings', roles: ['super'] },
  ];

  const visibleTabs = tabs.filter(tab => tab.roles.includes(profile?.admin_role));

  return (
    <Layout>
      <header className="admin-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>MTJ Admin</h1>
            <p className="tagline">{roleDisplay} ADMIN</p>
          </div>
        </div>
        
        {/* PRO FEATURE 2: Global Quick Search Bar */}
        <div style={{ marginTop: '15px' }}>
          <input 
            type="text" 
            placeholder="🔍 Search members, agents, or QR tokens..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-search-bar"
          />
        </div>
      </header>

      {/* PRO FEATURE 3: Mobile-First Scrollable Tabs */}
      <nav className="admin-tabs">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
            style={{ position: 'relative' }}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span className="notification-badge">{tab.badge}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="admin-content">
        {activeTab === 'treasury' && <AdminTreasury searchQuery={searchQuery} />}
        {activeTab === 'payouts' && <AdminPayouts searchQuery={searchQuery} />}
        {activeTab === 'cards' && <AdminCardQueue searchQuery={searchQuery} />}
        {activeTab === 'members' && <AdminEsusuManager searchQuery={searchQuery} />}
        {activeTab === 'agents' && <AdminAgentManagement searchQuery={searchQuery} />}
        {activeTab === 'reconcile' && <AdminReconciliation />}
        {activeTab === 'settings' && (
          <div className="view-section">
            <h2>⚙️ System Settings</h2>
            <p style={{color: 'red'}}> Restricted to Super Admin only.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}