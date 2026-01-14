/**
 * AddContactModal Component
 * Modal for manually adding or editing a contact
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels, fontSizePixels } from '@rallia/design-system';
import { neutral } from '@rallia/design-system';
import {
  createSharedContact,
  updateSharedContact,
  type SharedContact,
} from '@rallia/shared-services';

interface ThemeColors {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  inputBackground: string;
}

interface AddContactModalProps {
  visible: boolean;
  listId: string;
  editingContact: SharedContact | null;
  colors: ThemeColors;
  isDark: boolean;
  onClose: (refreshNeeded?: boolean) => void;
}

const AddContactModal: React.FC<AddContactModalProps> = ({
  visible,
  listId,
  editingContact,
  colors,
  isDark,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!editingContact;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      if (editingContact) {
        setName(editingContact.name);
        setPhone(editingContact.phone || '');
        setEmail(editingContact.email || '');
        setNotes(editingContact.notes || '');
      } else {
        setName('');
        setPhone('');
        setEmail('');
        setNotes('');
      }
    }
  }, [visible, editingContact]);

  const validateForm = (): boolean => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a name');
      return false;
    }

    if (!trimmedPhone && !trimmedEmail) {
      Alert.alert('Error', 'Please enter at least a phone number or email address');
      return false;
    }

    // Basic email validation
    if (trimmedEmail && !trimmedEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (isEditing && editingContact) {
        await updateSharedContact({
          id: editingContact.id,
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await createSharedContact({
          list_id: listId,
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
          source: 'manual',
        });
      }
      onClose(true);
    } catch (error) {
      console.error('Failed to save contact:', error);
      Alert.alert(
        'Error',
        `Failed to ${isEditing ? 'update' : 'add'} the contact. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = name.trim() && (phone.trim() || email.trim());

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => onClose()}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => onClose()} disabled={isSubmitting}>
            <Text size="base" color={colors.primary}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text size="lg" weight="semibold" color={colors.text}>
            {isEditing ? 'Edit Contact' : 'Add Contact'}
          </Text>
          <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting || !canSubmit}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text
                size="base"
                weight="semibold"
                color={canSubmit ? colors.primary : colors.textMuted}
              >
                {isEditing ? 'Save' : 'Add'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Form */}
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text size="sm" weight="medium" color={colors.textSecondary} style={styles.label}>
              Name *
            </Text>
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.inputBackground, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor={colors.textMuted}
                autoFocus
                maxLength={150}
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Phone Input */}
          <View style={styles.inputGroup}>
            <Text size="sm" weight="medium" color={colors.textSecondary} style={styles.label}>
              Phone Number
            </Text>
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.inputBackground, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="call-outline"
                size={20}
                color={colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 234 567 8900"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                maxLength={30}
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text size="sm" weight="medium" color={colors.textSecondary} style={styles.label}>
              Email Address
            </Text>
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.inputBackground, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={255}
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Notes Input */}
          <View style={styles.inputGroup}>
            <Text size="sm" weight="medium" color={colors.textSecondary} style={styles.label}>
              Notes (optional)
            </Text>
            <View
              style={[
                styles.inputContainer,
                styles.notesContainer,
                { backgroundColor: colors.inputBackground, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[styles.input, styles.notesInput, { color: colors.text }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add a note about this contact..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                maxLength={500}
                textAlignVertical="top"
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Hint */}
          <View style={[styles.hint, { backgroundColor: isDark ? neutral[800] : neutral[100] }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
            <Text size="sm" color={colors.textSecondary} style={styles.hintText}>
              At least one contact method (phone or email) is required.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    borderBottomWidth: 1,
  },
  form: {
    flex: 1,
    padding: spacingPixels[4],
  },
  inputGroup: {
    marginBottom: spacingPixels[4],
  },
  label: {
    marginBottom: spacingPixels[2],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radiusPixels.md,
    paddingHorizontal: spacingPixels[3],
  },
  inputIcon: {
    marginRight: spacingPixels[2],
  },
  input: {
    flex: 1,
    paddingVertical: spacingPixels[3],
    fontSize: fontSizePixels.base,
  },
  notesContainer: {
    alignItems: 'flex-start',
    paddingVertical: spacingPixels[2],
  },
  notesInput: {
    minHeight: 80,
    paddingTop: spacingPixels[1],
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacingPixels[3],
    borderRadius: radiusPixels.md,
    gap: spacingPixels[2],
    marginTop: spacingPixels[2],
    marginBottom: spacingPixels[4],
  },
  hintText: {
    flex: 1,
    lineHeight: 20,
  },
});

export default AddContactModal;
