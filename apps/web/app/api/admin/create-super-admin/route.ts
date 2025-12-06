import { Database } from '@/types';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * One-time endpoint to create the first super admin
 *
 * SECURITY: This endpoint should be:
 * 1. Protected by an environment variable (SUPER_ADMIN_SETUP_KEY)
 * 2. Disabled in production after first admin is created
 * 3. Only accessible during initial setup
 *
 * Usage:
 *   POST /api/admin/create-super-admin
 *   Headers: { "X-Setup-Key": "your-setup-key-from-env" }
 *   Body: { "email": "admin@rallia.app", "role": "super_admin" }
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPER_ADMIN_SETUP_KEY = process.env.SUPER_ADMIN_SETUP_KEY;
const ALLOW_SUPER_ADMIN_SETUP = process.env.ALLOW_SUPER_ADMIN_SETUP === 'true';

export async function POST(request: NextRequest) {
  // Security check: Only allow if explicitly enabled
  if (!ALLOW_SUPER_ADMIN_SETUP) {
    return NextResponse.json({ error: 'Super admin setup is disabled' }, { status: 403 });
  }

  // Verify setup key
  const setupKey = request.headers.get('X-Setup-Key');
  if (!SUPER_ADMIN_SETUP_KEY || setupKey !== SUPER_ADMIN_SETUP_KEY) {
    return NextResponse.json({ error: 'Invalid setup key' }, { status: 401 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { email, role = 'super_admin' } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Create admin client with service role
    const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if any admins already exist
    const { data: existingAdmins, error: checkError } = await supabaseAdmin
      .from('admins')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('Error checking existing admins:', checkError);
    }

    // Optional: Prevent creating multiple super admins
    // Uncomment if you want to restrict to one super admin
    // if (existingAdmins && existingAdmins.length > 0) {
    //   return NextResponse.json(
    //     { error: "Super admin already exists. Use the CLI script instead." },
    //     { status: 409 }
    //   );
    // }

    // Check if user exists in auth
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      return NextResponse.json({ error: 'Failed to check existing users' }, { status: 500 });
    }

    const existingUser = users.users.find(u => u.email === email);
    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create user in Auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
      });

      if (createError) {
        return NextResponse.json(
          { error: `Failed to create user: ${createError.message}` },
          { status: 500 }
        );
      }

      userId = newUser.user.id;
    }

    // Create/update profile
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
      {
        id: userId,
        email,
        full_name: 'Super Admin',
        display_name: 'Admin',
        is_active: true,
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      return NextResponse.json(
        { error: `Failed to create profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    // Create admin record
    const { error: adminError } = await supabaseAdmin.from('admins').upsert(
      {
        id: userId,
        role,
        permissions: {},
        notes: 'Created via API endpoint',
      },
      { onConflict: 'id' }
    );

    if (adminError) {
      return NextResponse.json(
        { error: `Failed to create admin: ${adminError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Super admin created successfully',
        userId,
        email,
        role,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Super admin creation error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
