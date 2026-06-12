import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/admin.css';
import AdminCardQueue from './AdminCardQueue';
import AdminEsusuManager from './AdminEsusuManager';
import AdminTreasury from './AdminTreasury';
import AdminPayouts from './AdminPayouts';
import AdminAgentManagement from './AdminAgentManagement';
import AdminReconciliation from './AdminReconciliation'; // NEW

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('treasury');
  const roleDisplay = profile?.admin_role?.toUpperCase() || 'ADMIN';

  const tabs = [
    { id: 'treasury', label: '💰 Treasury', roles: ['super', 'ops'] },
    { id: 'payouts', label: '💸 Payouts', roles: ['super', 'ops'] },
    { id: 'cards', label: '🖨️ Cards', roles: ['super', 'ops', 'support'] },
    { id: 'members', label: '👥 Members/Esusu', roles: ['super', 'ops', 'support'] },
    { id: 'agents', label: '🤝 Agents', roles: ['super', 'ops'] },
    { id: 'reconcile', label: '📊 Reconcile', roles: ['super', 'ops'] }, // NEW
    { id: 'settings', label: '⚙️ Settings', roles: ['super'] },
  ];

  const visibleTabs = tabs.filter(tab => tab.roles.includes(profile?.admin_role));

  return (
    <Layout>
      <header className="admin-header">
        <h1>MTJ Admin Console</h1>
        <p className="tagline">Logged in as: {roleDisplay} ADMIN</p>
      </header>
      <nav className="admin-tabs">
        {visibleTabs.map(tab => (
          <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="admin-content">
        {activeTab === 'treasury' && <AdminTreasury />}
        {activeTab === 'payouts' && <AdminPayouts />}
        {activeTab === 'cards' && <AdminCardQueue />}
        {activeTab === 'members' && <AdminEsusuManager />}
        {activeTab === 'agents' && <AdminAgentManagement />}
        {activeTab === 'reconcile' && <AdminReconciliation />}
        {activeTab === 'settings' && (
          <div className="view-section">
            <h2>⚙️ System Settings</h2>
            <p style={{color: 'red'}}>🔒 Restricted to Super Admin only.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}