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
  /** Refetch user sports from the server */
  refetch: () => void;
}

const SportContext = createContext<SportContextValue | undefined>(undefined);

interface SportProviderProps {
  children: ReactNode;
}

export function SportProvider({ children }: SportProviderProps) {
  const { playerSports, loading: playerSportsLoading, refetch } = usePlayerSports();
  const [selectedSport, setSelectedSportState] = useState<Sport | null>(null);
  const [userSports, setUserSports] = useState<Sport[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Process player sports data into Sport[] format
  useEffect(() => {
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
      if (!isInitialized && sports.length > 0) {
        initializeSelectedSport(sports, primarySport);
      }
    } else if (!playerSportsLoading) {
      setUserSports([]);
      setSelectedSportState(null);
      setIsInitialized(true);
    }
  }, [playerSports, playerSportsLoading, isInitialized]);

  const initializeSelectedSport = async (sports: Sport[], primarySport: Sport | null) => {
    try {
      const savedSportId = await AsyncStorage.getItem(SPORT_STORAGE_KEY);

      if (savedSportId) {
        // Try to find the saved sport in user's sports
        const savedSport = sports.find(s => s.id === savedSportId);
        if (savedSport) {
          setSelectedSportState(savedSport);
          setIsInitialized(true);
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
    } finally {
      setIsInitialized(true);
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

  const value: SportContextValue = {
    selectedSport,
    userSports,
    isLoading: playerSportsLoading || !isInitialized,
    setSelectedSport,
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
