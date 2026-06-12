import { supabase } from '../supabase';

// Calculate Trust Score based on user activity
export async function calculateTrustScore(userId) {
  let score = 50; // Base starting score for agent-registered members

  // 1. Fetch all ledger entries for this user
  const { data: wallets } = await supabase.from('wallets').select('id').eq('user_id', userId);
  const walletIds = wallets ? wallets.map(w => w.id) : [];

  if (walletIds.length > 0) {
    const { data: entries } = await supabase
      .from('ledger_entries')
      .select('type, direction')
      .in('wallet_id', walletIds);

    // 2. Apply scoring rules
    if (entries) {
      entries.forEach(entry => {
        // +2 points for every successful contribution
        if (entry.type === 'deposit' && entry.direction === 'credit') {
          score += 2;
        }
        // +15 points for completing a target (we'll track this via a specific note or type later, for now we just use deposits)
        
        // -5 points for early withdrawal penalties
        if (entry.type === 'early_access_fee') {
          score -= 10;
        }
      });
    }
  }

  // 3. Fetch profile to check for failed PIN attempts
  const { data: profile } = await supabase.from('profiles').select('failed_pin_attempts').eq('id', userId).single();
  if (profile && profile.failed_pin_attempts > 0) {
    score -= (profile.failed_pin_attempts * 5);
  }

  // 4. Enforce Caps (Min 20, Max 100)
  if (score > 100) score = 100;
  if (score < 20) score = 20;

  // 5. Update the database with the new score
  await supabase.from('profiles').update({ trust_score: score }).eq('id', userId);

  return score;
}

// Get the Trust Tier based on the score
export function getTrustTier(score) {
  if (score >= 90) return { name: 'Platinum', color: '#f5a623', icon: '💎' };
  if (score >= 70) return { name: 'Gold', color: '#27ae60', icon: '🥇' };
  if (score >= 40) return { name: 'Silver', color: '#2980b9', icon: '🥈' };
  return { name: 'Bronze', color: '#7f8c8d', icon: '🥉' };
}