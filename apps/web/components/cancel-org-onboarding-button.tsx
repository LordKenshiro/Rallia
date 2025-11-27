'use client';

import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { useAuth } from '@rallia/shared-hooks';
import { createClient } from '@/lib/supabase/client';
import { useMemo } from 'react';

export default function SignOutButton({ label }: { label: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { signOut } = useAuth({ client: supabase });
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/sign-in');
    router.refresh();
  };

  return (
    <Button variant="outline" onClick={handleSignOut}>
      {label}
    </Button>
  );
}
