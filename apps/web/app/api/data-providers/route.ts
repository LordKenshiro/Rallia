import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: dataProviders, error } = await supabase
      .from('data_provider')
      .select('id, name, provider_type')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching data providers:', error);
      return NextResponse.json({ error: 'Failed to fetch data providers' }, { status: 500 });
    }

    return NextResponse.json({ dataProviders: dataProviders || [] });
  } catch (error) {
    console.error('Data providers fetch error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching data providers' },
      { status: 500 }
    );
  }
}
