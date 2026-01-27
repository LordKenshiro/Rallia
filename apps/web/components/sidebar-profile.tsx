'use client';

import { createClient } from '@/lib/supabase/client';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSidebar } from './sidebar-context';
import { useOrganization } from './organization-context';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ProfileData {
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
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
  const t = useTranslations('app');
  const { isCollapsed } = useSidebar();
  const {
    organizations,
    selectedOrganization,
    selectOrganization,
    hasMultipleOrgs,
    isLoading: orgLoading,
  } = useOrganization();
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

        setProfileData({
          user: {
            email: user.email || '',
            firstName: profile?.first_name || null,
            lastName: profile?.last_name || null,
          },
        });
      } catch (error) {
        console.error('Error fetching sidebar profile:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfileData();
  }, [supabase]);

  if (isLoading || orgLoading) {
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

  // Organization switcher for users with multiple orgs
  const organizationSection = selectedOrganization && (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Building2 className="size-3 shrink-0" />
      <span className="truncate">{selectedOrganization.name}</span>
      {hasMultipleOrgs && <ChevronsUpDown className="size-3 shrink-0 ml-auto" />}
    </div>
  );

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
          {organizationSection}
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
            {selectedOrganization && (
              <span className="text-muted-foreground text-xs">{selectedOrganization.name}</span>
            )}
            {hasMultipleOrgs && (
              <span className="text-muted-foreground text-xs italic">
                {t('orgSwitcher.clickToSwitch')}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // If user has multiple orgs, wrap in dropdown menu
  if (hasMultipleOrgs) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="px-4 py-3 w-full hover:bg-muted/50 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            {content}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {t('orgSwitcher.switchOrganization')}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizations.map(org => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => {
                if (org.id !== selectedOrganization?.id) {
                  selectOrganization(org);
                }
              }}
              className={cn('cursor-pointer', org.id === selectedOrganization?.id && 'bg-accent')}
            >
              <Building2 className="size-4 mr-2" />
              <span className="flex-1 truncate">{org.name}</span>
              {org.id === selectedOrganization?.id && (
                <Check className="size-4 ml-2 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return <div className="px-4 py-3">{content}</div>;
}
