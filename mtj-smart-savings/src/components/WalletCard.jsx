import { useNavigate } from 'react-router-dom';
import '../styles/cards.css';

const LABELS = { daily: '💰 Daily Savings', rotation: '🔄 Rotation', target: '🎯 Target', loan: '💳 Loan', rewards: '🎁 Rewards' };

export default function WalletCard({ wallet }) {
  const navigate = useNavigate();
  const pct = wallet.target_amount ? Math.min(100, (Number(wallet.balance) / Number(wallet.target_amount)) * 100) : null;
  return (
    <div className="wallet-card" onClick={() => wallet.type === 'target' && wallet.target_id && navigate('/target/' + wallet.target_id)}
         style={{ cursor: wallet.type === 'target' && wallet.target_id ? 'pointer' : 'default' }}>
      <span>{LABELS[wallet.type]}</span>
      <h3>₦ {Number(wallet.balance || 0).toLocaleString('en-NG')}</h3>
      {pct !== null && (
        <React.Fragment>
          <div style={{ height: 4, background: 'rgba(255,255,255,.25)', borderRadius: 2, marginTop: 8 }}>
            <div style={{ height: '100%', width: pct + '%', background: 'var(--accent)', borderRadius: 2 }} />
          </div>
          <small>{pct.toFixed(0)}% of ₦{Number(wallet.target_amount).toLocaleString('en-NG')}</small>
        </React.Fragment>
      )}
    </div>
  );
}
