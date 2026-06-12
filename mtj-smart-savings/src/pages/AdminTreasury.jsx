import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import Layout from '../components/Layout';
import '../styles/admin.css';

export default function AdminTreasury() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalWallets: 0,
    pendingPayouts: 0,
    pendingAmount: 0,
  });

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    // 1. Count Members
    const { count: memberCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user');

    // 2. Count Pending Payouts & Amount
    const { data: payouts } = await supabase
      .from('agent_payouts')
      .select('amount')
      .eq('status', 'pending');

    const pendingAmount = payouts ? payouts.reduce((sum, p) => sum + Number(p.amount), 0) : 0;

    // 3. Estimate Total Wallets (Simple count for now)
    const { count: walletCount } = await supabase
      .from('wallets')
      .select('*', { count: 'exact', head: true });

    setStats({
      totalMembers: memberCount || 0,
      totalWallets: walletCount || 0,
      pendingPayouts: payouts ? payouts.length : 0,
      pendingAmount: pendingAmount,
    });
  }

  return (
    <div className="view-section">
      <h2>💰 Treasury Overview</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '20px' }}>
        <div style={{ background: '#e8f8ef', padding: '20px', borderRadius: '12px' }}>
          <small style={{ color: '#27ae60', fontWeight: 'bold' }}>ACTIVE MEMBERS</small>
          <h3 style={{ margin: '5px 0', fontSize: '28px' }}>{stats.totalMembers}</h3>
        </div>
        
        <div style={{ background: '#fff8e1', padding: '20px', borderRadius: '12px' }}>
          <small style={{ color: '#b7791f', fontWeight: 'bold' }}>PENDING PAYOUTS</small>
          <h3 style={{ margin: '5px 0', fontSize: '28px', color: '#b7791f' }}>{stats.pendingPayouts}</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>Total: ₦{stats.pendingAmount.toLocaleString()}</p>
        </div>

        <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '12px' }}>
          <small style={{ color: '#2980b9', fontWeight: 'bold' }}>TOTAL WALLETS</small>
          <h3 style={{ margin: '5px 0', fontSize: '28px' }}>{stats.totalWallets}</h3>
        </div>

        <div style={{ background: '#f3e5f5', padding: '20px', borderRadius: '12px' }}>
          <small style={{ color: '#8e24aa', fontWeight: 'bold' }}>MTJ PLATFORM FEE</small>
          <h3 style={{ margin: '5px 0', fontSize: '28px' }}>₦{(stats.pendingAmount * 0.5).toLocaleString()}</h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Est. Revenue from pending payouts</p>
        </div>
      </div>
    </div>
  );
}