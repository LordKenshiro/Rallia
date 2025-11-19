import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import AppHeader from '../components/AppHeader';

const Map = () => {
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader backgroundColor="#C8F2EF" />
      
      <View style={styles.mapContainer}>
        <Text style={styles.placeholderText}>Map View</Text>
        {/* Add your map component here (e.g., react-native-maps) */}
      </View>
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
