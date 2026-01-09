import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlayerSports } from '@rallia/shared-hooks';
import { SportService } from '@rallia/shared-services';

const SPORT_STORAGE_KEY = '@rallia/selected-sport';

/**
 * Sport interface for context consumption
 */
export interface Sport {
  id: string;
  name: string;
  display_name: string;
  icon_url?: string | null;
}

interface SportContextValue {
  /** Currently selected sport */
  selectedSport: Sport | null;
  /** All sports the user has registered for */
  userSports: Sport[];
  /** Whether sports data is loading */
  isLoading: boolean;
  /** Select a sport */
  setSelectedSport: (sport: Sport) => Promise<void>;
  /** Set sports from ordered selection (first becomes default). Used by first-time sport selection overlay. */
  setSelectedSportsOrdered: (orderedSports: Sport[]) => Promise<void>;
  /** Refetch user sports from the server */
  refetch: () => void;
}

const SportContext = createContext<SportContextValue | undefined>(undefined);

interface SportProviderProps {
  children: ReactNode;
  /** The authenticated user's ID. Pass from your auth context. */
  userId?: string;
}

export function SportProvider({ children, userId }: SportProviderProps) {
  const { playerSports, loading: playerSportsLoading, refetch } = usePlayerSports(userId);
  const [selectedSport, setSelectedSportState] = useState<Sport | null>(null);
  const [userSports, setUserSports] = useState<Sport[]>([]);
  const [allSports, setAllSports] = useState<Sport[]>([]);
  const [allSportsLoading, setAllSportsLoading] = useState(false);

  // Fetch all sports for guest users (no userId)
  useEffect(() => {
    if (!userId) {
      setAllSportsLoading(true);
      SportService.getAllSports()
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to fetch all sports:', error);
            return;
          }
          if (data) {
            const sports: Sport[] = data.map(s => ({
              id: s.id,
              name: s.name,
              display_name: s.display_name,
              icon_url: s.icon_url,
            }));
            setAllSports(sports);
            // Initialize selected sport for guest user
            if (sports.length > 0) {
              initializeSelectedSport(sports, null);
            }
          }
        })
        .finally(() => {
          setAllSportsLoading(false);
        });
    } else {
      // Clear all sports when user logs in (will use playerSports instead)
      setAllSports([]);
    }
  }, [userId]);

  // Process player sports data into Sport[] format (for authenticated users)
  useEffect(() => {
    if (!userId) return; // Skip for guest users

    if (playerSports && playerSports.length > 0) {
      const sports: Sport[] = [];
      let primarySport: Sport | null = null;

      playerSports.forEach(ps => {
        const sportData = Array.isArray(ps.sport) ? ps.sport[0] : ps.sport;
        if (sportData && typeof sportData === 'object') {
          const sport: Sport = {
            id: sportData.id,
            name: sportData.name,
            display_name: sportData.display_name,
            icon_url: sportData.icon_url,
          };
          sports.push(sport);

          // Track primary sport
          if (ps.is_primary) {
            primarySport = sport;
          }
        }
      });

      setUserSports(sports);

      // Initialize selected sport from storage or use primary/first sport
      if (sports.length > 0) {
        initializeSelectedSport(sports, primarySport);
      }
    } else if (!playerSportsLoading) {
      setUserSports([]);
      setSelectedSportState(null);
    }
  }, [playerSports, playerSportsLoading, userId]);

  const initializeSelectedSport = async (sports: Sport[], primarySport: Sport | null) => {
    try {
      const savedSportId = await AsyncStorage.getItem(SPORT_STORAGE_KEY);

      if (savedSportId) {
        // Try to find the saved sport in user's sports
        const savedSport = sports.find(s => s.id === savedSportId);
        if (savedSport) {
          setSelectedSportState(savedSport);
          return;
        }
      }

      // Fall back to primary sport or first sport
      const defaultSport = primarySport || sports[0];
      setSelectedSportState(defaultSport);

      // Save the default selection
      if (defaultSport) {
        await AsyncStorage.setItem(SPORT_STORAGE_KEY, defaultSport.id);
      }
    } catch (error) {
      console.error('Failed to initialize selected sport:', error);
      // Fall back to primary or first sport
      setSelectedSportState(primarySport || sports[0] || null);
    }
  };

  const setSelectedSport = useCallback(async (sport: Sport) => {
    try {
      await AsyncStorage.setItem(SPORT_STORAGE_KEY, sport.id);
      setSelectedSportState(sport);
    } catch (error) {
      console.error('Failed to save selected sport:', error);
      // Still update state even if storage fails
      setSelectedSportState(sport);
    }
  }, []);

  /**
   * Set sports from an ordered selection (first-time user flow).
   * The first sport in the array becomes the default selected sport.
   */
  const setSelectedSportsOrdered = useCallback(
    async (orderedSports: Sport[]) => {
      if (orderedSports.length === 0) return;

      const primarySport = orderedSports[0];

      try {
        // Save the first selected sport as the current selection
        await AsyncStorage.setItem(SPORT_STORAGE_KEY, primarySport.id);
        setSelectedSportState(primarySport);

        // For guest users, update the available sports to match selection order
        if (!userId) {
          // Keep all sports available but ensure selected ones are prioritized
          // The user can still see all sports via the selector
          setAllSports(prev => {
            // Move selected sports to the front in order
            const selectedIds = new Set(orderedSports.map(s => s.id));
            const unselected = prev.filter(s => !selectedIds.has(s.id));
            return [...orderedSports, ...unselected];
          });
        }
      } catch (error) {
        console.error('Failed to save ordered sport selection:', error);
        // Still update state even if storage fails
        setSelectedSportState(primarySport);
      }
    },
    [userId]
  );

  // For guest users, use allSports; for authenticated users, use userSports
  const availableSports = userId ? userSports : allSports;
  const isLoading = userId ? playerSportsLoading : allSportsLoading;

  const value: SportContextValue = {
    selectedSport,
    userSports: availableSports,
    isLoading,
    setSelectedSport,
    setSelectedSportsOrdered,
    refetch,
  };

  return <SportContext.Provider value={value}>{children}</SportContext.Provider>;
}

/**
 * Hook to access sport context
 *
 * @example
 * ```tsx
 * const { selectedSport, userSports, setSelectedSport } = useSport();
 *
 * // Display current sport
 * <Text>{selectedSport?.display_name}</Text>
 *
 * // Change sport
 * const handleSportChange = (sport: Sport) => setSelectedSport(sport);
 * ```
 */
export function useSport(): SportContextValue {
  const context = useContext(SportContext);
  if (context === undefined) {
    throw new Error('useSport must be used within a SportProvider');
  }
  return context;
}

export { SportContext };
