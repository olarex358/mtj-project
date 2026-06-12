import { getQueue, markSynced, markFailed } from './offline';
import { supabase } from '../supabase';
import { recordEntry } from './ledger';

let syncing = false;

export async function syncQueue({ onProgress } = {}) {
  if (syncing || !navigator.onLine) return;
  syncing = true;

  try {
    const queue = await getQueue();
    const pending = queue.filter(x => x.status !== 'synced' && x.retries < 5);
    if (pending.length === 0) return { synced: 0 };

    let synced = 0, failed = 0;

    for (const item of pending) {
      try {
        if (onProgress) onProgress({ current: synced + failed + 1, total: pending.length });

        // Find the correct wallet for the user and type
        const { data: wallet, error: walletErr } = await supabase
          .from('wallets')
          .select('id')
          .eq('user_id', item.userId)
          .eq('type', item.walletType)
          .single();

        if (walletErr || !wallet) {
          await markFailed(item.id, { message: 'Wallet not found' });
          failed++;
          continue;
        }

        // Use our standard recordEntry function to keep the ledger clean
        await recordEntry({
          walletId: wallet.id,
          userId: item.userId,
          agentId: item.agentId || null,
          type: item.type,
          amount: item.amount,
          direction: item.direction,
          reference: item.reference,
          note: item.note ? item.note + ' [Synced Offline]' : 'Synced Offline'
        });

        await markSynced(item.id);
        synced++;
      } catch (err) {
        await markFailed(item.id, err);
        failed++;
      }
    }

    return { synced, failed };
  } finally {
    syncing = false;
  }
}

export function startSyncListener() {
  window.addEventListener('online', () => {
    console.log('[MTJ] Back online. Syncing queue...');
    syncQueue();
  });

  // Check every 30 seconds just in case
  setInterval(() => {
    if (navigator.onLine) syncQueue();
  }, 30000);
}