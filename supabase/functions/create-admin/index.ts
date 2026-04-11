const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { username, password, full_name, branch_id } = await req.json();

    if (!username || !password || !full_name) {
      throw new Error("Missing required fields: username, password, full_name");
    }

    // 2. Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase Environmental Credentials.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 3. Map username to dummy email
    const disguisedEmail = `${username.toLowerCase().trim()}@safaarigroup.local`;

    // 4. Create the Auth User forcefully via Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: disguisedEmail,
      password: password,
      email_confirm: true,
      user_metadata: { full_name } // Put it here just in case!
    });

    if (authError) {
      throw authError;
    }

    const newUserId = authData.user.id;

    // 5. Update the automatically generated Profile row
    // Wait briefly to ensure the database trigger had time to create the empty profile
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: 'admin',
        branch_id: branch_id === 'global' ? null : (branch_id || null),
        full_name: full_name
      })
      .eq('id', newUserId);

    if (profileError) {
      console.error("Profile linking failed, but Auth user was created.", profileError);
      throw new Error(`Profile update failed: ${profileError.message}`);
    }

    // 6. Return Success
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Admin created successfully", 
      user_id: newUserId 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error creating admin:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
