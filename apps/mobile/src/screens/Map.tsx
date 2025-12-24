import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStyles, useTranslation } from '../hooks';
import { fontSizePixels, spacingPixels } from '@rallia/design-system';
import { useAppNavigation } from '../navigation/hooks';

const Map = () => {
  const { colors } = useThemeStyles();
  const { t } = useTranslation();
  const navigation = useAppNavigation();

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <View style={[styles.mapContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
          {t('map.placeholder')}
        </Text>
      </View>

      {/* Close button positioned at the bottom center */}
      <View style={styles.closeButtonContainer}>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.card }]}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
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
  closeButtonContainer: {
    position: 'absolute',
    bottom: spacingPixels[8],
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default Map;
