'use client';

import { createClient } from '@/lib/supabase/client';
import { Building2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSidebar } from './sidebar-context';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface ProfileData {
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  organization: {
    name: string;
    slug: string;
  } | null;
}

function getInitials(firstName: string | null, lastName: string | null, email: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function SidebarProfile() {
  const { isCollapsed } = useSidebar();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchProfileData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsLoading(false);
          return;
        }

        // Fetch profile
        const { data: profile } = await supabase
          .from('profile')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        // Fetch organization membership
        const { data: membership } = await supabase
          .from('organization_member')
          .select(
            `
            organization (
              name,
              slug
            )
          `
          )
          .eq('user_id', user.id)
          .is('left_at', null)
          .limit(1)
          .single();

        const org = membership?.organization as { name: string; slug: string } | null;

        setProfileData({
          user: {
            email: user.email || '',
            firstName: profile?.first_name || null,
            lastName: profile?.last_name || null,
          },
          organization: org,
        });
      } catch (error) {
        console.error('Error fetching sidebar profile:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfileData();
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-muted animate-pulse" />
          {!isCollapsed && (
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!profileData) {
    return null;
  }

  const initials = getInitials(
    profileData.user.firstName,
    profileData.user.lastName,
    profileData.user.email
  );

  const displayName = profileData.user.firstName
    ? `${profileData.user.firstName}${profileData.user.lastName ? ` ${profileData.user.lastName}` : ''}`
    : profileData.user.email.split('@')[0];

  const content = (
    <div className="flex items-center gap-3 w-full">
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
          {initials}
        </div>
        {/* Online indicator */}
        <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-green-500 border-2 border-background" />
      </div>

      {/* Text content - hidden when collapsed */}
      {!isCollapsed && (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate m-0">{displayName}</p>
          {profileData.organization && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="size-3 shrink-0" />
              <span className="truncate">{profileData.organization.name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Wrap in tooltip when collapsed
  if (isCollapsed) {
    return (
      <div className="px-3 py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex justify-center cursor-default">{content}</div>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col gap-0.5">
            <span className="font-medium">{displayName}</span>
            {profileData.organization && (
              <span className="text-muted-foreground text-xs">{profileData.organization.name}</span>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return <div className="px-4 py-3">{content}</div>;
}
