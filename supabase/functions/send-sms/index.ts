// Supabase Edge Function: send-sms
// Sends an SMS via the Golis Telecom SMS Gateway (https://dhambaal.golis.so/)
// Credentials are read from Supabase Secrets – NEVER hardcoded.

// Handles CORS preflight and actual POST CORS headers.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SMSRequest {
  phone: string;   // Recipient phone number (any format)
  message: string; // SMS text body
  event?: string;  // Optional: 'cargo_booking' | 'ticket_payment'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalise a Somali phone number to international format (252XXXXXXXXX).
 * Handles: 0611234567 → 252611234567, +252611234567 → 252611234567, etc.
 */
function normalisePhone(raw: string): string {
  // Remove all non-digit characters
  let digits = raw.replace(/\D/g, "");
  // Strip leading + sign (already removed by \D filter above)
  if (digits.startsWith("00252")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = "252" + digits.slice(1);
  if (!digits.startsWith("252")) digits = "252" + digits;
  return digits;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        ...corsHeaders,
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Read credentials from Supabase Secrets ──────────────────────────────
  const GOLIS_API_TOKEN = Deno.env.get("GOLIS_API_TOKEN");

  if (!GOLIS_API_TOKEN) {
    console.error("SMS Gateway credentials are not configured.");
    return new Response(
      JSON.stringify({ success: false, error: "GOLIS_API_TOKEN ma ahan mid lagu xiray server-ka." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Parse request body ────────────────────────────────────────────────────
  let body: SMSRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { phone, message, event = "general" } = body;

  if (!phone || !message) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing required fields: phone, message." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const normalisedPhone = normalisePhone(phone);
  let gatewayResponse = "";
  let success = false;

  // ── Call Golis API v3 ─────────────────────────────────────────────────────
  try {
    const url = "https://dhambaal.golis.so/api/v3/sms/send";
    
    const payload = {
      recipient: normalisedPhone,
      sender_id: "SAFAARI-BUS",
      type: "plain",
      message: message,
    };

    console.log(`[send-sms] Calling Golis for ${normalisedPhone}, event: ${event}`);

    const gatewayRes = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GOLIS_API_TOKEN.trim()}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    gatewayResponse = await gatewayRes.text();
    console.log(`[send-sms] Gateway response (status ${gatewayRes.status}): ${gatewayResponse}`);

    try {
      const jsonRes = JSON.parse(gatewayResponse);
      success = jsonRes.status === "success";
    } catch {
      success = gatewayRes.ok;
    }

    if (!success) {
      console.error(`[send-sms] Gateway returned non-success: ${gatewayResponse}`);
    }
  } catch (fetchErr) {
    gatewayResponse = String(fetchErr);
    console.error(`[send-sms] Network error calling Golis: ${gatewayResponse}`);
    success = false;
  }

  // ── Log to sms_log table via service-role client ─────────────────────────
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { error: logError } = await supabaseAdmin.from("sms_log").insert({
      recipient_phone: normalisedPhone,
      message_text: message,
      status: success ? "sent" : "failed",
      gateway_response: gatewayResponse.slice(0, 500),
      trigger_event: event,
      sms_type: event
    });

    if (logError) {
      console.error("[send-sms] Failed to write to sms_log:", logError.message);
    }
  } catch (logErr) {
    console.error("[send-sms] sms_log write exception:", String(logErr));
  }

  // ── Return result ─────────────────────────────────────────────────────────
  // Note: We return 200 even on failure so the Supabase client doesn't wrap the error in a generic generic "Failed to send a request" message.
  const returnStatus = 200;
  
  return new Response(
    JSON.stringify({ success, gateway_response: gatewayResponse, error: success ? null : gatewayResponse }),
    {
      status: returnStatus,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
});
