import { AdminLayoutWrapper } from '@/components/admin-layout-wrapper';
import { isAdmin } from '@/lib/supabase/check-admin';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // If not authenticated, redirect to admin sign-in
  if (authError || !user) {
    redirect('/admin/sign-in');
  }

  // Check if user is an admin
  const userIsAdmin = await isAdmin(user.id);

  // If not an admin, redirect to org dashboard
  if (!userIsAdmin) {
    redirect('/dashboard');
  }

  return <AdminLayoutWrapper>{children}</AdminLayoutWrapper>;
}
