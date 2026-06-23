import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function AdminTreasury({ searchQuery }) {
  const [stats, setStats] = useState({ totalMembers: 0, pendingPayouts: 0, pendingAmount: 0 });

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    const { count: memberCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user');
    const { data: payouts } = await supabase.from('agent_payouts').select('amount').eq('status', 'pending');
    const pendingAmount = payouts ? payouts.reduce((sum, p) => sum + Number(p.amount), 0) : 0;

    setStats({
      totalMembers: memberCount || 0,
      pendingPayouts: payouts ? payouts.length : 0,
      pendingAmount: pendingAmount,
    });
  }

  // PRO FEATURE 4: Daily CSV Export
  async function downloadDailyReport() {
    const today = new Date().toISOString().split('T')[0];
    const { data: entries } = await supabase
      .from('ledger_entries')
      .select('*, profiles(full_name, phone)')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    if (!entries || entries.length === 0) return alert('No transactions today.');

    // Convert to CSV
    let csvContent = "data:text/csv;charset=utf-8,Date,Type,Amount,Member Name,Phone,Note\n";
    entries.forEach(row => {
      const date = new Date(row.created_at).toLocaleTimeString();
      const name = row.profiles?.full_name || 'Unknown';
      const phone = row.profiles?.phone || 'N/A';
      csvContent += `${date},${row.type},${row.amount},${name},${phone},${row.note || ''}\n`;
    });

    // Trigger Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MTJ_Report_${today}.csv`);
    document.body.appendChild(link);
    link.click();
  }

  return (
    <div className="view-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>💰 Treasury Overview</h2>
        <button onClick={downloadDailyReport} className="outline" style={{ padding: '8px 16px', fontSize: '13px' }}>
           Download Today's CSV
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <div style={{ background: '#e8f8ef', padding: '20px', borderRadius: '12px' }}>
          <small style={{ color: '#27ae60', fontWeight: 'bold' }}>ACTIVE MEMBERS</small>
          <h3 style={{ margin: '5px 0', fontSize: '28px' }}>{stats.totalMembers}</h3>
        </div>
        <div style={{ background: '#fff8e1', padding: '20px', borderRadius: '12px' }}>
          <small style={{ color: '#b7791f', fontWeight: 'bold' }}>PENDING PAYOUTS</small>
          <h3 style={{ margin: '5px 0', fontSize: '28px', color: '#b7791f' }}>{stats.pendingPayouts}</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>Total: ₦{stats.pendingAmount.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}