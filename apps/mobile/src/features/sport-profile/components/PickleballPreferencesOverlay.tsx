import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Overlay } from '@rallia/shared-components';
import { PreferencesInfo } from '@rallia/shared-types';
import { selectionHaptic, mediumHaptic } from '../../../utils/haptics';
import { useThemeStyles } from '../../../hooks';
import { useTranslation, type TranslationKey } from '../../../hooks';
import { FavoriteFacilitiesSelector } from './FavoriteFacilitiesSelector';

/**
 * Dynamic play style option fetched from database
 */
export interface PlayStyleOption {
  id: string;
  name: string;
  description: string | null;
}

/**
 * Dynamic play attribute option fetched from database
 */
export interface PlayAttributeOption {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
}

export interface PlayAttributesByCategory {
  [category: string]: PlayAttributeOption[];
}

interface PickleballPreferencesOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSave: (preferences: PreferencesInfo) => void;
  initialPreferences?: PreferencesInfo;
  /** Dynamic play styles fetched from database */
  playStyleOptions?: PlayStyleOption[];
  /** Dynamic play attributes fetched from database, grouped by category */
  playAttributesByCategory?: PlayAttributesByCategory;
  /** Loading state for play options */
  loadingPlayOptions?: boolean;
  /** Player ID for favorite facilities */
  playerId?: string;
  /** Sport ID for filtering facilities */
  sportId?: string;
  /** User's latitude for distance calculation */
  latitude?: number | null;
  /** User's longitude for distance calculation */
  longitude?: number | null;
}

/**
 * Format a database name into a display label
 * e.g., 'aggressive_baseliner' -> 'Aggressive Baseliner'
 */
const formatName = (name: string): string => {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const PickleballPreferencesOverlay: React.FC<PickleballPreferencesOverlayProps> = ({
  visible,
  onClose,
  onSave,
  initialPreferences = {},
  playStyleOptions = [],
  playAttributesByCategory = {},
  loadingPlayOptions = false,
  playerId,
  sportId,
  latitude,
  longitude,
}) => {
  const { colors } = useThemeStyles();
  const { t } = useTranslation();

  const MATCH_DURATIONS: Array<{ value: '30' | '60' | '90' | '120'; label: string }> = [
    { value: '30', label: t('profile.preferences.durations.30') },
    { value: '60', label: t('profile.preferences.durations.60') },
    { value: '90', label: t('profile.preferences.durations.90') },
    { value: '120', label: t('profile.preferences.durations.120') },
  ];

  const MATCH_TYPES = [
    { value: 'casual', label: t('profile.preferences.matchTypes.casual') },
    { value: 'competitive', label: t('profile.preferences.matchTypes.competitive') },
    { value: 'both', label: t('profile.preferences.matchTypes.both') },
  ];

  // Build PLAY_STYLES from dynamic options
  const PLAY_STYLES = playStyleOptions.map(style => ({
    value: style.name,
    label: formatName(style.name),
    description: style.description,
  }));

  const [matchDuration, setMatchDuration] = useState<string | undefined>(
    initialPreferences.matchDuration
  );
  const [matchType, setMatchType] = useState<string | undefined>(initialPreferences.matchType);
  const [playStyle, setPlayStyle] = useState<string | undefined>(initialPreferences.playStyle);
  const [playAttributes, setPlayAttributes] = useState<string[]>(
    initialPreferences.playAttributes || []
  );
  const [showPlayStyleDropdown, setShowPlayStyleDropdown] = useState(false);

  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const slideAnim = useMemo(() => new Animated.Value(50), []);

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleTogglePlayAttribute = (attributeName: string) => {
    selectionHaptic();
    setPlayAttributes(prev =>
      prev.includes(attributeName)
        ? prev.filter(a => a !== attributeName)
        : [...prev, attributeName]
    );
  };

  const handleSelectPlayStyle = (style: string) => {
    selectionHaptic();
    setPlayStyle(style);
    setShowPlayStyleDropdown(false);
  };

  const handleSave = () => {
    mediumHaptic();
    onSave({
      matchDuration,
      matchType,
      playStyle,
      playAttributes,
    });
  };

  const canSave = matchDuration && matchType;

  return (
    <Overlay visible={visible} onClose={onClose} type="bottom" showBackButton={false}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            backgroundColor: colors.card,
          },
        ]}
      >
        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>
          {t('profile.preferences.updatePickleball')}
        </Text>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Match Duration */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('profile.preferences.matchDuration')}
            </Text>
            <View style={styles.chipsContainer}>
              {MATCH_DURATIONS.map(duration => (
                <TouchableOpacity
                  key={duration.value}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.inputBackground },
                    matchDuration === duration.value && [
                      styles.chipSelected,
                      { backgroundColor: colors.primary },
                    ],
                  ]}
                  onPress={() => {
                    selectionHaptic();
                    setMatchDuration(duration.value);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: colors.textMuted },
                      matchDuration === duration.value && [
                        styles.chipTextSelected,
                        { color: colors.primaryForeground },
                      ],
                    ]}
                  >
                    {duration.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Match Type */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('profile.preferences.matchType')}
            </Text>
            <View style={styles.chipsContainer}>
              {MATCH_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.inputBackground },
                    matchType === type.value && [
                      styles.chipSelected,
                      { backgroundColor: colors.primary },
                    ],
                  ]}
                  onPress={() => {
                    selectionHaptic();
                    setMatchType(type.value);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: colors.textMuted },
                      matchType === type.value && [
                        styles.chipTextSelected,
                        { color: colors.primaryForeground },
                      ],
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Favorite Facilities */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('profile.preferences.favoriteFacilities' as TranslationKey)}
            </Text>
            <Text style={[styles.sublabel, { color: colors.textMuted }]}>
              {t('profile.preferences.selectUpTo3' as TranslationKey)}
            </Text>
            {playerId && sportId ? (
              <FavoriteFacilitiesSelector
                playerId={playerId}
                sportId={sportId}
                latitude={latitude ?? null}
                longitude={longitude ?? null}
                colors={{
                  text: colors.text,
                  textMuted: colors.textMuted,
                  inputBackground: colors.inputBackground,
                  border: colors.border,
                  primary: colors.primary,
                  primaryForeground: colors.primaryForeground,
                  card: colors.card,
                }}
                t={(key: string) => t(key as Parameters<typeof t>[0])}
              />
            ) : (
              <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>Loading...</Text>
            )}
          </View>

          {/* Play Style */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('profile.preferences.playStyle')}
            </Text>
            <TouchableOpacity
              style={[
                styles.inputContainer,
                { backgroundColor: colors.inputBackground, borderColor: colors.border },
              ]}
              onPress={() => {
                selectionHaptic();
                setShowPlayStyleDropdown(!showPlayStyleDropdown);
              }}
            >
              <Text
                style={[
                  styles.input,
                  styles.dropdownText,
                  { color: playStyle ? colors.text : colors.textMuted },
                ]}
              >
                {playStyle
                  ? PLAY_STYLES.find(s => s.value === playStyle)?.label
                  : t('profile.preferences.selectPlayStyle')}
              </Text>
              <Ionicons
                name={showPlayStyleDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textMuted}
                style={styles.inputIcon}
              />
            </TouchableOpacity>

            {showPlayStyleDropdown && (
              <View
                style={[
                  styles.dropdown,
                  { backgroundColor: colors.inputBackground, borderColor: colors.border },
                ]}
              >
                {PLAY_STYLES.map(style => (
                  <TouchableOpacity
                    key={style.value}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: colors.border },
                      playStyle === style.value && [
                        styles.dropdownItemSelected,
                        { backgroundColor: colors.card },
                      ],
                    ]}
                    onPress={() => handleSelectPlayStyle(style.value)}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        { color: colors.text },
                        playStyle === style.value && [
                          styles.dropdownItemTextSelected,
                          { color: colors.primary, fontWeight: '600' },
                        ],
                      ]}
                    >
                      {style.label}
                    </Text>
                    {playStyle === style.value && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Play Attributes - grouped by category */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('profile.fields.playAttributes')}
            </Text>
            <Text style={[styles.sublabel, { color: colors.textMuted }]}>
              {t('profile.preferences.selectAllThatApply')}
            </Text>
            {loadingPlayOptions ? (
              <Text style={{ color: colors.textMuted, marginBottom: 12 }}>
                {t('common.loading')}
              </Text>
            ) : Object.keys(playAttributesByCategory).length > 0 ? (
              Object.entries(playAttributesByCategory).map(([category, attributes]) => (
                <View key={category} style={styles.categorySection}>
                  <Text style={[styles.categoryLabel, { color: colors.textMuted }]}>
                    {category}
                  </Text>
                  <View style={styles.chipsContainer}>
                    {attributes.map(attribute => (
                      <TouchableOpacity
                        key={attribute.name}
                        style={[
                          styles.attributeChip,
                          { backgroundColor: colors.inputBackground },
                          playAttributes.includes(attribute.name) && [
                            styles.attributeChipSelected,
                            { backgroundColor: colors.primary },
                          ],
                        ]}
                        onPress={() => handleTogglePlayAttribute(attribute.name)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: colors.textMuted },
                            playAttributes.includes(attribute.name) && [
                              styles.chipTextSelected,
                              { color: colors.primaryForeground },
                            ],
                          ]}
                        >
                          {formatName(attribute.name)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>
                No attributes available
              </Text>
            )}
          </View>
        </ScrollView>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.primary },
            !canSave && [styles.saveButtonDisabled, { backgroundColor: colors.buttonInactive }],
          ]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.saveButtonText,
              { color: colors.primaryForeground },
              !canSave && [styles.saveButtonTextDisabled, { color: colors.textMuted }],
            ]}
          >
            {t('common.save')}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 8,
    maxHeight: '90%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  scrollView: {
    flexGrow: 1,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sublabel: {
    fontSize: 14,
    marginBottom: 12,
    marginTop: -8,
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  chip: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: {
    // backgroundColor and borderColor applied inline
  },
  attributeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 0,
    marginBottom: 8,
    marginRight: 8,
  },
  attributeChipSelected: {
    // backgroundColor applied inline
  },
  chipText: {
    fontSize: 15,
    fontWeight: '400',
  },
  chipTextSelected: {
    // color applied inline
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  dropdownText: {
    paddingVertical: 14,
  },
  placeholder: {
    // color applied inline
  },
  inputIcon: {
    marginLeft: 8,
  },
  dropdown: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  dropdownItemSelected: {
    // backgroundColor applied inline
  },
  dropdownItemText: {
    fontSize: 16,
  },
  dropdownItemTextSelected: {
    // fontWeight and color applied inline
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    // color applied inline
  },
});
