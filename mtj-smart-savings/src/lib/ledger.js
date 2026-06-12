import { supabase } from '../supabase';

// Standard transaction entry
export async function recordEntry({ walletId, userId, agentId, type, amount, direction, reference, note }) {
  const { data, error } = await supabase
    .from('ledger_entries')
    .insert({ 
      wallet_id: walletId, 
      user_id: userId, 
      agent_id: agentId || null, 
      type, 
      amount, 
      direction, 
      reference: reference || null, 
      note: note || null 
    })
    .select().single();
  if (error) throw error;
  return data;
}

export async function getWalletBalance(walletId) {
  const { data, error } = await supabase.rpc('wallet_balance', { p_wallet_id: walletId });
  if (error) throw error;
  return Number(data);
}

// NEW: Handle the ₦400 Registration Split
export async function recordRegistrationSplit(memberUserId, agentUserId, memberDailyWalletId, agentRewardsWalletId) {
  // 1. Agent gets ₦200 Commission
  await supabase.from('ledger_entries').insert({
    wallet_id: agentRewardsWalletId,
    user_id: agentUserId,
    type: 'registration_commission',
    amount: 200,
    direction: 'credit',
    note: 'Agent registration fee (50%)'
  });

  // 2. MTJ gets ₦200 Platform Fee (We use a dummy wallet_id for platform revenue tracking)
  await supabase.from('ledger_entries').insert({
    wallet_id: memberDailyWalletId, // Temporarily using member wallet to track, but direction is debit
    user_id: memberUserId,
    type: 'platform_registration_fee',
    amount: 200,
    direction: 'debit', // Deducted from their "virtual" balance so it stays at 0
    note: 'MTJ Platform fee (50%)'
  });
}