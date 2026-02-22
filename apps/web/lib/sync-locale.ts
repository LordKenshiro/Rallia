import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types';

/**
 * Syncs the given locale to both auth user_metadata and profile.preferred_locale
 * for the currently signed-in user. Used when the user toggles language so that
 * server-side notifications and auth email templates use the correct locale.
 * No-op if no user is signed in. Errors are logged but not thrown.
 */
export async function syncLocaleToBackend(
  supabase: SupabaseClient<Database>,
  locale: string
): Promise<void> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return;

    const { error: profileError } = await supabase
      .from('profile')
      .update({ preferred_locale: locale as Database['public']['Enums']['locale_enum'] })
      .eq('id', user.id);

    if (profileError) {
      console.error('Failed to sync locale to profile:', profileError);
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: { locale },
    });

    if (authError) {
      console.error('Failed to sync locale to auth user_metadata:', authError);
    }
  } catch (error) {
    console.error('Failed to sync locale to backend:', error);
  }
}
