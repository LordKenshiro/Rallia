import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Overlay } from '@rallia/shared-components';
import { COLORS } from '@rallia/shared-constants';
import {
  PreferencesInfo,
  PlayStyleEnum,
  PlayAttributeEnum,
  PLAY_STYLE_LABELS,
  PLAY_ATTRIBUTE_LABELS,
} from '@rallia/shared-types';
import { selectionHaptic, mediumHaptic } from '../../../utils/haptics';
import { useThemeStyles } from '../../../hooks';

interface PickleballPreferencesOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSave: (preferences: PreferencesInfo) => void;
  initialPreferences?: PreferencesInfo;
}

const MATCH_DURATIONS = ['1h', '1.5h', '2h'];
const MATCH_TYPES = ['Casual', 'Competitive', 'Both'];

const PLAY_STYLES: { value: PlayStyleEnum; label: string }[] = Object.entries(
  PLAY_STYLE_LABELS
).map(([value, label]) => ({ value: value as PlayStyleEnum, label }));

const PLAY_ATTRIBUTES: { value: PlayAttributeEnum; label: string }[] = Object.entries(
  PLAY_ATTRIBUTE_LABELS
).map(([value, label]) => ({ value: value as PlayAttributeEnum, label }));

export const PickleballPreferencesOverlay: React.FC<PickleballPreferencesOverlayProps> = ({
  visible,
  onClose,
  onSave,
  initialPreferences = {},
}) => {
  const { colors } = useThemeStyles();
  const [matchDuration, setMatchDuration] = useState<string | undefined>(
    initialPreferences.matchDuration
  );
  const [matchType, setMatchType] = useState<string | undefined>(initialPreferences.matchType);
  const [court, setCourt] = useState<string>(initialPreferences.court || '');
  const [playStyle, setPlayStyle] = useState<PlayStyleEnum | undefined>(
    initialPreferences.playStyle
  );
  const [playAttributes, setPlayAttributes] = useState<PlayAttributeEnum[]>(
    initialPreferences.playAttributes || []
  );
  const [showPlayStyleDropdown, setShowPlayStyleDropdown] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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
  }, [visible, fadeAnim, slideAnim]);

  const handleTogglePlayAttribute = (attribute: PlayAttributeEnum) => {
    selectionHaptic();
    setPlayAttributes(prev =>
      prev.includes(attribute) ? prev.filter(a => a !== attribute) : [...prev, attribute]
    );
  };

  const handleSelectPlayStyle = (style: PlayStyleEnum) => {
    selectionHaptic();
    setPlayStyle(style);
    setShowPlayStyleDropdown(false);
  };

  const handleSave = () => {
    mediumHaptic();
    onSave({
      matchDuration,
      matchType,
      court,
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
        {/* Header with back and close buttons */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={[styles.backButtonText, { color: colors.text }]}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>
          Update your pickleball preferences
        </Text>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Match Duration */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Match Duration</Text>
            <View style={styles.chipsContainer}>
              {MATCH_DURATIONS.map(duration => (
                <TouchableOpacity
                  key={duration}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.inputBackground },
                    matchDuration === duration && [
                      styles.chipSelected,
                      { backgroundColor: colors.primary },
                    ],
                  ]}
                  onPress={() => {
                    selectionHaptic();
                    setMatchDuration(duration);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: colors.textMuted },
                      matchDuration === duration && [
                        styles.chipTextSelected,
                        { color: colors.primaryForeground },
                      ],
                    ]}
                  >
                    {duration}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Match Type */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Match Type</Text>
            <View style={styles.chipsContainer}>
              {MATCH_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.inputBackground },
                    matchType === type && [
                      styles.chipSelected,
                      { backgroundColor: colors.primary },
                    ],
                  ]}
                  onPress={() => {
                    selectionHaptic();
                    setMatchType(type);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: colors.textMuted },
                      matchType === type && [
                        styles.chipTextSelected,
                        { color: colors.primaryForeground },
                      ],
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Court */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Court</Text>
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.inputBackground, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g., Parc Jarry"
                placeholderTextColor={colors.textMuted}
                value={court}
                onChangeText={setCourt}
              />
              <Ionicons
                name="chevron-down"
                size={20}
                color={colors.textMuted}
                style={styles.inputIcon}
              />
            </View>
          </View>

          {/* Play Style */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Play Style</Text>
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
                  : 'Select your play style'}
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

          {/* Play Attributes */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Play Attributes</Text>
            <Text style={[styles.sublabel, { color: colors.textMuted }]}>
              Select all that apply
            </Text>
            <View style={styles.chipsContainer}>
              {PLAY_ATTRIBUTES.map(attribute => (
                <TouchableOpacity
                  key={attribute.value}
                  style={[
                    styles.attributeChip,
                    { backgroundColor: colors.inputBackground },
                    playAttributes.includes(attribute.value) && [
                      styles.attributeChipSelected,
                      { backgroundColor: colors.primary },
                    ],
                  ]}
                  onPress={() => handleTogglePlayAttribute(attribute.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: colors.textMuted },
                      playAttributes.includes(attribute.value) && [
                        styles.chipTextSelected,
                        { color: colors.primaryForeground },
                      ],
                    ]}
                  >
                    {attribute.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
            Save
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    fontWeight: '300',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  scrollView: {
    marginBottom: 20,
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
