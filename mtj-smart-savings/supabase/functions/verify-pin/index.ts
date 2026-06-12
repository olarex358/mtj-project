import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { pin, qr_token } = await req.json();
    if (!/^\d{4}$/.test(pin)) return new Response(JSON.stringify({ ok: false, error: "Invalid PIN format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: profile } = await supabase.from("profiles").select("id, pin_hash, card_frozen, failed_pin_attempts, full_name").eq("card_qr_token", qr_token).single();

    if (!profile) return new Response(JSON.stringify({ ok: false, error: "Card not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (profile.card_frozen) return new Response(JSON.stringify({ ok: false, error: "Card frozen" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if ((profile.failed_pin_attempts || 0) >= 3) return new Response(JSON.stringify({ ok: false, error: "Card locked" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const valid = await bcrypt.compare(pin, profile.pin_hash);
    if (!valid) {
      await supabase.from("profiles").update({ failed_pin_attempts: (profile.failed_pin_attempts || 0) + 1 }).eq("id", profile.id);
      return new Response(JSON.stringify({ ok: false, error: "Incorrect PIN" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (profile.failed_pin_attempts > 0) await supabase.from("profiles").update({ failed_pin_attempts: 0 }).eq("id", profile.id);

    return new Response(JSON.stringify({ ok: true, user_id: profile.id, full_name: profile.full_name }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
