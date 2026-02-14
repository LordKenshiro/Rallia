import { createServiceRoleClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.fullName || !body.city || !body.email) {
      return NextResponse.json(
        { error: 'Full name, city, and email are required' },
        { status: 400 }
      );
    }

    // Validate at least one sport is selected
    if (!body.playsTennis && !body.playsPickleball) {
      return NextResponse.json({ error: 'At least one sport must be selected' }, { status: 400 });
    }

    // Validate tennis level if plays tennis
    if (body.playsTennis && !body.tennisLevel) {
      return NextResponse.json({ error: 'Tennis level is required' }, { status: 400 });
    }

    // Validate pickleball level if plays pickleball
    if (body.playsPickleball && !body.pickleballLevel) {
      return NextResponse.json({ error: 'Pickleball level is required' }, { status: 400 });
    }

    // Validate skill level values
    const validLevels = ['beginner', 'intermediate', 'advanced', 'elite'];
    if (body.tennisLevel && !validLevels.includes(body.tennisLevel)) {
      return NextResponse.json({ error: 'Invalid tennis level' }, { status: 400 });
    }
    if (body.pickleballLevel && !validLevels.includes(body.pickleballLevel)) {
      return NextResponse.json({ error: 'Invalid pickleball level' }, { status: 400 });
    }

    // Use service role so we can insert without a session (public signup form)
    const supabase = createServiceRoleClient();

    // Insert data into beta_signup table
    const { data, error } = await supabase
      .from('beta_signup')
      .insert({
        full_name: body.fullName,
        city: body.city,
        plays_tennis: body.playsTennis || false,
        tennis_level: body.tennisLevel || null,
        plays_pickleball: body.playsPickleball || false,
        pickleball_level: body.pickleballLevel || null,
        email: body.email,
        phone: body.phone || null,
        ip_address: body.ipAddress || null,
        location: body.location || null,
      })
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to submit beta signup' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Beta signup submission error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}
