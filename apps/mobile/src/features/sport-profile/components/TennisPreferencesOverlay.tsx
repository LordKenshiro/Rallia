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
  PlayStyle, 
  PlayAttribute,
  PLAY_STYLE_LABELS,
  PLAY_ATTRIBUTE_LABELS,
} from '@rallia/shared-types';
import { selectionHaptic, mediumHaptic } from '../../../utils/haptics';

interface TennisPreferencesOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSave: (preferences: PreferencesInfo) => void;
  initialPreferences?: PreferencesInfo;
}

const MATCH_DURATIONS = ['1h', '1.5h', '2h'];
const MATCH_TYPES = ['Casual', 'Competitive', 'Both'];

const PLAY_STYLES: { value: PlayStyle; label: string }[] = Object.entries(PLAY_STYLE_LABELS).map(
  ([value, label]) => ({ value: value as PlayStyle, label })
);

const PLAY_ATTRIBUTES: { value: PlayAttribute; label: string }[] = Object.entries(PLAY_ATTRIBUTE_LABELS).map(
  ([value, label]) => ({ value: value as PlayAttribute, label })
);

export const TennisPreferencesOverlay: React.FC<TennisPreferencesOverlayProps> = ({
  visible,
  onClose,
  onSave,
  initialPreferences = {},
}) => {
  const [matchDuration, setMatchDuration] = useState<string | undefined>(
    initialPreferences.matchDuration
  );
  const [matchType, setMatchType] = useState<string | undefined>(
    initialPreferences.matchType
  );
  const [court, setCourt] = useState<string>(initialPreferences.court || '');
  const [playStyle, setPlayStyle] = useState<PlayStyle | undefined>(
    initialPreferences.playStyle
  );
  const [playAttributes, setPlayAttributes] = useState<PlayAttribute[]>(
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

  const handleTogglePlayAttribute = (attribute: PlayAttribute) => {
    selectionHaptic();
    setPlayAttributes((prev) =>
      prev.includes(attribute)
        ? prev.filter((a) => a !== attribute)
        : [...prev, attribute]
    );
  };

  const handleSelectPlayStyle = (style: PlayStyle) => {
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
          },
        ]}
      >
        {/* Header with back and close buttons */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.title}>Update your tennis preferences</Text>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Match Duration */}
          <View style={styles.section}>
            <Text style={styles.label}>Match Duration</Text>
            <View style={styles.chipsContainer}>
              {MATCH_DURATIONS.map((duration) => (
                <TouchableOpacity
                  key={duration}
                  style={[
                    styles.chip,
                    matchDuration === duration && styles.chipSelected,
                  ]}
                  onPress={() => {
                    selectionHaptic();
                    setMatchDuration(duration);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      matchDuration === duration && styles.chipTextSelected,
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
            <Text style={styles.label}>Match Type</Text>
            <View style={styles.chipsContainer}>
              {MATCH_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chip,
                    matchType === type && styles.chipSelected,
                  ]}
                  onPress={() => {
                    selectionHaptic();
                    setMatchType(type);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      matchType === type && styles.chipTextSelected,
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
            <Text style={styles.label}>Court</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="e.g., Jeanne-Mance Park"
                placeholderTextColor={COLORS.gray}
                value={court}
                onChangeText={setCourt}
              />
              <Ionicons
                name="chevron-down"
                size={20}
                color={COLORS.gray}
                style={styles.inputIcon}
              />
            </View>
          </View>

          {/* Play Style */}
          <View style={styles.section}>
            <Text style={styles.label}>Play Style</Text>
            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => {
                selectionHaptic();
                setShowPlayStyleDropdown(!showPlayStyleDropdown);
              }}
            >
              <Text
                style={[
                  styles.input,
                  !playStyle && styles.placeholder,
                  styles.dropdownText,
                ]}
              >
                {playStyle
                  ? PLAY_STYLES.find((s) => s.value === playStyle)?.label
                  : 'Select your play style'}
              </Text>
              <Ionicons
                name={showPlayStyleDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.gray}
                style={styles.inputIcon}
              />
            </TouchableOpacity>

            {showPlayStyleDropdown && (
              <View style={styles.dropdown}>
                {PLAY_STYLES.map((style) => (
                  <TouchableOpacity
                    key={style.value}
                    style={[
                      styles.dropdownItem,
                      playStyle === style.value && styles.dropdownItemSelected,
                    ]}
                    onPress={() => handleSelectPlayStyle(style.value)}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        playStyle === style.value &&
                          styles.dropdownItemTextSelected,
                      ]}
                    >
                      {style.label}
                    </Text>
                    {playStyle === style.value && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={COLORS.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Play Attributes */}
          <View style={styles.section}>
            <Text style={styles.label}>Play Attributes</Text>
            <Text style={styles.sublabel}>Select all that apply</Text>
            <View style={styles.chipsContainer}>
              {PLAY_ATTRIBUTES.map((attribute) => (
                <TouchableOpacity
                  key={attribute.value}
                  style={[
                    styles.attributeChip,
                    playAttributes.includes(attribute.value) &&
                      styles.attributeChipSelected,
                  ]}
                  onPress={() => handleTogglePlayAttribute(attribute.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      playAttributes.includes(attribute.value) &&
                        styles.chipTextSelected,
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
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.8}
        >
          <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>
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
    color: '#333',
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
    color: '#000',
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
    color: COLORS.dark,
    marginBottom: 12,
  },
  sublabel: {
    fontSize: 14,
    color: COLORS.gray,
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
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  attributeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#E8F5F3',
    borderWidth: 0,
    marginBottom: 8,
    marginRight: 8,
  },
  attributeChipSelected: {
    backgroundColor: '#2C7A6B',
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.veryLightGray,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.dark,
  },
  dropdownText: {
    paddingVertical: 14,
  },
  placeholder: {
    color: COLORS.gray,
  },
  inputIcon: {
    marginLeft: 8,
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: COLORS.veryLightGray,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  dropdownItemSelected: {
    backgroundColor: COLORS.backgroundLight,
  },
  dropdownItemText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  saveButton: {
    backgroundColor: '#F5A5A5',
    borderRadius: 12,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#D3D3D3',
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
});
