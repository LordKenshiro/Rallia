import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, LocationPermissionOverlay } from '@rallia/shared-components';
import RalliaLogo from '../../assets/images/light mode logo.svg';

const Map = () => {
  const [showLocationPermission, setShowLocationPermission] = useState(false);

  const handleAcceptLocation = () => {
    console.log('Location permission accepted');
    setShowLocationPermission(false);
  };

  const handleRefuseLocation = () => {
    console.log('Location permission refused');
    setShowLocationPermission(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <Text style={styles.placeholderText}>Map View</Text>
      </View>

      <LocationPermissionOverlay
        visible={showLocationPermission}
        onAccept={handleAcceptLocation}
        onRefuse={handleRefuseLocation}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
  },
  placeholderText: {
    fontSize: 18,
    color: '#666',
  },
});

export default Map;
