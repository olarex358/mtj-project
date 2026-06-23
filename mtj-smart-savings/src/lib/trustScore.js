import { supabase } from '../supabase';

export function getTrustTier(score) {
  if (score >= 90) return { name: 'Platinum', color: '#8B5CF6', icon: '💎' };
  if (score >= 75) return { name: 'Gold', color: '#F59E0B', icon: '🥇' };
  if (score >= 50) return { name: 'Silver', color: '#9CA3AF', icon: '🥈' };
  return { name: 'Bronze', color: '#B45309', icon: '🥉' };
}

export async function calculateTrustScore(userId) {
  const { data: txns } = await supabase.from('ledger_entries').select('id').eq('user_id', userId);
  const count = txns ? txns.length : 0;
  
  // Simple algorithm: Base 40 + 2 points per transaction (max 100)
  let score = 40 + (count * 2);
  if (score > 100) score = 100;

  await supabase.from('profiles').update({ trust_score: score }).eq('id', userId);
  return score;
}