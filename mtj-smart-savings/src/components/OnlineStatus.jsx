import { useEffect, useState } from 'react';
import { syncQueue } from '../lib/sync';
import '../styles/status.css';

export default function OnlineStatus({ pendingCount = 0 }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  async function forceSync() {
    setSyncing(true);
    try { await syncQueue(); } finally { setSyncing(false); }
  }

  if (online && pendingCount === 0) return null;

  return (
    <div className={'status-bar ' + (online ? 'online' : 'offline')}>
      <div className="status-content">
        {online ? (
          <React.Fragment>
            <span className="dot"></span>
            <span>{pendingCount} transaction(s) syncing</span>
            <button className="sync-btn" onClick={forceSync} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync now'}</button>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <span className="dot"></span>
            <span>Offline · Transactions will queue and sync automatically</span>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}
