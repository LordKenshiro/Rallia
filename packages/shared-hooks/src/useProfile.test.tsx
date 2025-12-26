/**
 * Tests for useProfile hook
 *
 * Tests cover:
 * - Initial loading state
 * - Successful profile fetch
 * - Error handling
 * - Refetch functionality
 * - User ID parameter handling
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useProfile, ProfileProvider } from './useProfile';
import { supabase } from '@rallia/shared-services';
import React from 'react';

// Mock Supabase
jest.mock('@rallia/shared-services');

describe('useProfile', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockProfile = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    display_name: 'TestUser',
    profile_picture_url: 'https://example.com/avatar.jpg',
    date_of_birth: '1990-01-01',
    gender: 'male',
    phone_number: '+1234567890',
    bio: 'Test bio',
    city: 'Test City',
    state_province: 'Test State',
    country: 'Test Country',
    rating: 4.5,
    matches_played: 10,
    matches_won: 7,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should start with loading true and null profile', () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve({ data: mockProfile }), 100))
              ),
          }),
        }),
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ProfileProvider userId={mockUser.id}>{children}</ProfileProvider>
      );

      const { result } = renderHook(() => useProfile(), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Successful Profile Fetch', () => {
    it('should fetch profile for authenticated user', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ProfileProvider userId={mockUser.id}>{children}</ProfileProvider>
      );

      const { result } = renderHook(() => useProfile(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.error).toBeNull();
    });

    it('should fetch profile for specific user ID using refetchForUser', async () => {
      const targetUserId = 'user-456';

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { ...mockProfile, id: targetUserId },
              error: null,
            }),
          }),
        }),
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ProfileProvider userId={mockUser.id}>{children}</ProfileProvider>
      );

      const { result } = renderHook(() => useProfile(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Use refetchForUser to fetch a different user's profile
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { ...mockProfile, id: targetUserId },
              error: null,
            }),
          }),
        }),
      });

      await result.current.refetchForUser(targetUserId);

      await waitFor(() => {
        expect(result.current.profile?.id).toBe(targetUserId);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing userId gracefully', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ProfileProvider userId={undefined}>{children}</ProfileProvider>
      );

      const { result } = renderHook(() => useProfile(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should handle profile fetch error', async () => {
      const mockError = {
        message: 'Profile not found',
        code: '404',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ProfileProvider userId={mockUser.id}>{children}</ProfileProvider>
      );

      const { result } = renderHook(() => useProfile(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Profile not found');
    });

    it('should handle unexpected errors during fetch', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ProfileProvider userId={mockUser.id}>{children}</ProfileProvider>
      );

      const { result } = renderHook(() => useProfile(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Network error');
    });
  });

  describe('Refetch Functionality', () => {
    it('should allow manual refetch', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ProfileProvider userId={mockUser.id}>{children}</ProfileProvider>
      );

      const { result } = renderHook(() => useProfile(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toEqual(mockProfile);

      // Update mock to return updated profile
      const updatedProfile = { ...mockProfile, display_name: 'Updated Name' };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: updatedProfile,
              error: null,
            }),
          }),
        }),
      });

      // Trigger refetch
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.profile?.display_name).toBe('Updated Name');
      });
    });

    it('should handle refetch errors', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ProfileProvider userId={mockUser.id}>{children}</ProfileProvider>
      );

      const { result } = renderHook(() => useProfile(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock error on refetch
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Refetch failed' },
            }),
          }),
        }),
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error?.message).toBe('Refetch failed');
      });
    });
  });

  describe('User ID Changes', () => {
    it('should refetch when ProfileProvider userId changes', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const wrapper = ({
        children,
        userId,
      }: {
        children: React.ReactNode;
        userId?: string | undefined;
      }) => <ProfileProvider userId={userId}>{children}</ProfileProvider>;

      const { result, rerender } = renderHook(() => useProfile(), {
        wrapper: wrapper as React.ComponentType<{
          children: React.ReactNode;
          userId?: string | undefined;
        }>,
        initialProps: { userId: 'user-123' },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile?.id).toBe('user-123');

      // Update mock for new userId
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { ...mockProfile, id: 'user-456' },
              error: null,
            }),
          }),
        }),
      });

      // Change userId in provider
      rerender({ userId: 'user-456' });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile?.id).toBe('user-456');
      // Should have fetched new profile
      expect(supabase.from).toHaveBeenCalledTimes(2);
    });
  });
});
