import { getWalletBalance } from '../lib/ledger';
import { useEffect, useState } from 'react';

const walletConfig = {
  daily: { label: 'Daily Savings', icon: '💰', color: '#00B875' },
  rotation: { label: 'Esusu / Rotation', icon: '🔄', color: '#3B82F6' },
  target: { label: 'Target Savings', icon: '', color: '#8B5CF6' },
  loan: { label: 'Loans', icon: '🏦', color: '#F59E0B' },
  rewards: { label: 'Rewards', icon: '🎁', color: '#EC4899' }
};

export default function WalletCard({ wallet }) {
  const [balance, setBalance] = useState(0);
  const config = walletConfig[wallet.type] || walletConfig.daily;

  useEffect(() => {
    getWalletBalance(wallet.id).then(setBalance);
  }, [wallet.id]);

  return (
    <div style={{ 
      background: 'white', 
      padding: '16px', 
      borderRadius: '16px', 
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      border: `1px solid #F3F4F6`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '16px' }}>{config.icon}</span>
        <small style={{ color: '#6B7280', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>{config.label}</small>
      </div>
      <h3 style={{ margin: 0, color: '#111827', fontSize: '18px', fontWeight: '700' }}>
        ₦{Number(balance).toLocaleString()}
      </h3>
    </div>
  );
}