import { supabase } from '../supabase';

// Calculate balance by summing all credits and debits
export async function getWalletBalance(walletId) {
  const { data, error } = await supabase
    .from('ledger_entries')
    .select('amount, direction')
    .eq('wallet_id', walletId);

  if (error || !data) return 0;

  let balance = 0;
  data.forEach(entry => {
    if (entry.direction === 'credit') balance += Number(entry.amount);
    if (entry.direction === 'debit') balance -= Number(entry.amount);
  });
  return balance;
}

// Record a new transaction
export async function recordEntry({ walletId, userId, agentId, type, amount, direction, reference, note }) {
  const { error } = await supabase.from('ledger_entries').insert({
    wallet_id: walletId,
    user_id: userId,
    agent_id: agentId,
    type,
    amount: Number(amount),
    direction,
    reference,
    note,
    created_at: new Date().toISOString()
  });
  if (error) throw error;
}

// Offline queue (saves to local storage for later sync)
export async function queueTransaction(txn) {
  const queue = JSON.parse(localStorage.getItem('mtj_offline_queue') || '[]');
  queue.push(txn);
  localStorage.setItem('mtj_offline_queue', JSON.stringify(queue));
}