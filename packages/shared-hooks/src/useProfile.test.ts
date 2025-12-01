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
import { useProfile } from './useProfile';
import { supabase } from '@rallia/shared-services';

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
      // Mock successful auth but delay profile fetch
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockImplementation(() => 
              new Promise(resolve => setTimeout(() => resolve({ data: mockProfile }), 100))
            ),
          }),
        }),
      });

      const { result } = renderHook(() => useProfile());

      expect(result.current.loading).toBe(true);
      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Successful Profile Fetch', () => {
    it('should fetch profile for authenticated user', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.error).toBeNull();
      expect(supabase.auth.getUser).toHaveBeenCalledTimes(1);
    });

    it('should fetch profile for specific user ID', async () => {
      const targetUserId = 'user-456';

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockProfile, id: targetUserId },
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useProfile(targetUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile?.id).toBe(targetUserId);
      // Hook calls getUser but uses provided userId for profile fetch
      expect(supabase.auth.getUser).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle auth error gracefully', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should handle profile fetch error', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      const mockError = {
        message: 'Profile not found',
        code: '404',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Profile not found');
    });

    it('should handle unexpected errors during fetch', async () => {
      (supabase.auth.getUser as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useProfile());

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
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toEqual(mockProfile);

      // Clear mocks to track refetch call
      jest.clearAllMocks();

      // Update mock to return updated profile
      const updatedProfile = { ...mockProfile, display_name: 'Updated Name' };
      
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
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

      expect(supabase.auth.getUser).toHaveBeenCalledTimes(1);
    });

    it('should handle refetch errors', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock error on refetch
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
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
    it('should refetch when userId prop changes', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const { result, rerender } = renderHook(
        ({ userId }) => useProfile(userId),
        { initialProps: { userId: 'user-123' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile?.id).toBe('user-123');

      // Change userId
      rerender({ userId: 'user-456' });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have fetched new profile
      expect(supabase.from).toHaveBeenCalledTimes(2);
    });
  });
});
