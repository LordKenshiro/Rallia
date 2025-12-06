import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_PLACES_API_KEY is not configured');
      return NextResponse.json({ error: 'Google Places API not configured' }, { status: 500 });
    }

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.displayName,places.formattedAddress,places.addressComponents,places.location',
      },
      body: JSON.stringify({
        textQuery: query,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Places API error:', errorText);
      return NextResponse.json({ error: 'Failed to search places' }, { status: response.status });
    }

    const data = await response.json();

    // Parse the first place result if available
    if (data.places && data.places.length > 0) {
      const place = data.places[0];
      const addressComponents = place.addressComponents || [];

      // Extract address parts from components
      const getComponent = (types: string[]) => {
        const component = addressComponents.find((c: any) =>
          types.some((type: string) => c.types?.includes(type))
        );
        return component?.longText || '';
      };

      const streetNumber = getComponent(['street_number']);
      const route = getComponent(['route']);
      const city =
        getComponent(['locality']) ||
        getComponent(['administrative_area_level_3']) ||
        getComponent(['sublocality_level_1']);
      const country = getComponent(['country']);
      const postalCode = getComponent(['postal_code']);

      return NextResponse.json({
        places: data.places,
        parsed: {
          name: place.displayName?.text || '',
          address: [streetNumber, route].filter(Boolean).join(' '),
          formattedAddress: place.formattedAddress || '',
          city,
          country,
          postalCode,
          latitude: place.location?.latitude || null,
          longitude: place.location?.longitude || null,
        },
      });
    }

    return NextResponse.json({ places: [], parsed: null });
  } catch (error) {
    console.error('Places search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
