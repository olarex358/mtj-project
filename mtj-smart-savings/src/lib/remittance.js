import { supabase } from '../supabase';
import { openOPayRemit } from './opay';

export async function initiateRemittance(agentId, amount) {
  const reference = 'RMT-' + Date.now().toString(36).toUpperCase();
  const { data, error } = await supabase.from('remittances').insert({ agent_id: agentId, amount: Number(amount), expected_amount: Number(amount), status: 'pending' }).select().single();
  if (error) throw error;
  openOPayRemit(amount, reference);
  return { ...data, reference };
}

export async function submitOPayReference(remittanceId, opayReference) {
  await supabase.from('remittances').update({ opay_reference: opayReference, status: 'awaiting_confirmation' }).eq('id', remittanceId);
}

export async function confirmRemittance(remittanceId, adminId, actualAmount, note) {
  const { data: rem } = await supabase.from('remittances').select('*').eq('id', remittanceId).single();
  await supabase.from('remittances').update({
    status: 'settled', confirmed_by: adminId, confirmed_at: new Date().toISOString(),
    actual_amount: actualAmount !== undefined ? actualAmount : rem.expected_amount, admin_note: note || null,
    mismatch_reason: (actualAmount !== undefined && actualAmount !== rem.expected_amount) ? 'Amount mismatch' : null
  }).eq('id', remittanceId);
}

export async function rejectRemittance(remittanceId, reason) {
  await supabase.from('remittances').update({ status: 'rejected', mismatch_reason: reason }).eq('id', remittanceId);
}
