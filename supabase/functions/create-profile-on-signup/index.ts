// Edge Function: Create profile on user signup
// This is triggered automatically when a user signs up via Supabase Auth

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  record: {
    id: string;
    email: string;
    created_at: string;
  };
  schema: string;
}

Deno.serve(async (req) => {
  try {
    // Get the webhook payload
    const payload: WebhookPayload = await req.json();

    // Only process user signup events
    if (payload.type !== 'INSERT' || payload.table !== 'users') {
      return new Response(JSON.stringify({ message: 'Not a user signup event' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create profile for the new user
    const { error } = await supabase
      .from('profile')
      .insert({
        id: payload.record.id,
        email: payload.record.email,
        created_at: payload.record.created_at,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      // If profile already exists, that's fine
      if (error.code === '23505') {
        console.log(`Profile already exists for user ${payload.record.id}`);
        return new Response(JSON.stringify({ message: 'Profile already exists' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      throw error;
    }

    console.log(`Created profile for user ${payload.record.id}`);
    return new Response(
      JSON.stringify({ message: 'Profile created successfully' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
