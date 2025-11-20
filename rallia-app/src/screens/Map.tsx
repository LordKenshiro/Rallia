import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import AppHeader from '../components/AppHeader';
import { LocationPermissionOverlay } from '../components/overlays';

const Map = () => {
  const [showLocationPermission, setShowLocationPermission] = useState(false);

  // Disabled auto-show for now - location permission is shown after auth flow
  // useEffect(() => {
  //   // Show location permission overlay when map screen is first opened
  //   // In a real app, check if permission was already granted
  //   const timer = setTimeout(() => {
  //     setShowLocationPermission(true);
  //   }, 500);

  //   return () => clearTimeout(timer);
  // }, []);

  const handleAcceptLocation = () => {
    console.log('Location permission accepted');
    setShowLocationPermission(false);
    // TODO: Request actual location permission
  };

  const handleRefuseLocation = () => {
    console.log('Location permission refused');
    setShowLocationPermission(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader backgroundColor="#C8F2EF" />
      
      <View style={styles.mapContainer}>
        <Text style={styles.placeholderText}>Map View</Text>
        {/* Add your map component here (e.g., react-native-maps) */}
      </View>

      {/* Location Permission Overlay - Center Type */}
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
