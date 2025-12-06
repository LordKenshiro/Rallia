import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { usePlayerSports } from '@rallia/shared-hooks';
import { Text } from '../foundation/Text.native';

interface Sport {
  id: string;
  name: string;
  display_name: string;
}

const SportSelector: React.FC = () => {
  const { playerSports, refetch } = usePlayerSports();
  const [userSports, setUserSports] = useState<Sport[]>([]);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Process player sports data
  useEffect(() => {
    if (playerSports && playerSports.length > 0) {
      const sports: Sport[] = [];
      
      playerSports.forEach((ps) => {
        const sportData = Array.isArray(ps.sport) ? ps.sport[0] : ps.sport;
        if (sportData && typeof sportData === 'object') {
          sports.push({
            id: sportData.id,
            name: sportData.name,
            display_name: sportData.display_name,
          });
        }
      });
      
      setUserSports(sports);
      
      // Set first sport as default if none selected
      if (!selectedSport && sports.length > 0) {
        setSelectedSport(sports[0]);
      }
    } else {
      setUserSports([]);
      setSelectedSport(null);
    }
  }, [playerSports, selectedSport]);

  // Refetch sports when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleSportSelect = (sport: Sport) => {
    setSelectedSport(sport);
    setShowDropdown(false);
  };

  if (!selectedSport || userSports.length === 0) {
    return null;
  }

  return (
    <>
      <TouchableOpacity 
        style={styles.selector}
        onPress={() => setShowDropdown(!showDropdown)}
      >
        <Text color="#fff" weight="semibold" size="sm">
          {selectedSport.display_name}
        </Text>
        <Ionicons 
          name={showDropdown ? "chevron-up" : "chevron-down"} 
          size={16} 
          color="#fff" 
        />
      </TouchableOpacity>

      {showDropdown && userSports.length > 1 && (
        <Modal
          visible={showDropdown}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDropdown(false)}
          >
            <View style={styles.dropdownContainer}>
              <ScrollView>
                {userSports.map((sport) => (
                  <TouchableOpacity
                    key={sport.id}
                    style={[
                      styles.dropdownItem,
                      selectedSport?.id === sport.id && styles.dropdownItemSelected
                    ]}
                    onPress={() => handleSportSelect(sport)}
                  >
                    <Text 
                      color={selectedSport?.id === sport.id ? '#FF7B9C' : '#333'}
                      weight={selectedSport?.id === sport.id ? 'semibold' : 'regular'}
                    >
                      {sport.display_name}
                    </Text>
                    {selectedSport?.id === sport.id && (
                      <Ionicons name="checkmark" size={20} color="#FF7B9C" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF7B9C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 200,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#FFF5F8',
  },
});

export default SportSelector;
