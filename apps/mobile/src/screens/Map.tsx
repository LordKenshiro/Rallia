import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, LocationPermissionOverlay } from '@rallia/shared-components';
import { Logger } from '@rallia/shared-services';
import { useThemeStyles, useTranslation } from '../hooks';
import { fontSizePixels } from '@rallia/design-system';
import RalliaLogo from '../../assets/images/logo-dark.svg';

const Map = () => {
  const { colors } = useThemeStyles();
  const { t } = useTranslation();
  const [showLocationPermission, setShowLocationPermission] = useState(false);

  const handleAcceptLocation = () => {
    Logger.logUserAction('location_permission_accepted');
    setShowLocationPermission(false);
  };

  const handleRefuseLocation = () => {
    Logger.logUserAction('location_permission_refused');
    setShowLocationPermission(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <View style={[styles.mapContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
          {t('map.placeholder')}
        </Text>
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
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: fontSizePixels.lg,
    textAlign: 'center',
  },
});

export default Map;
