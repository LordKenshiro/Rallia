import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: sports, error } = await supabase
      .from('sports')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching sports:', error);
      return NextResponse.json({ error: 'Failed to fetch sports' }, { status: 500 });
    }

    return NextResponse.json({ sports: sports || [] });
  } catch (error) {
    console.error('Sports fetch error:', error);
    return NextResponse.json({ error: 'An error occurred while fetching sports' }, { status: 500 });
  }
}
