/**
 * QRScannerModal
 * Modal with camera view for scanning group invite QR codes
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@rallia/shared-components';
import { useThemeStyles } from '../../../hooks';
import { useJoinGroupByInviteCode } from '@rallia/shared-hooks';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  playerId: string;
  onGroupJoined: (groupId: string, groupName: string) => void;
}

export function QRScannerModal({
  visible,
  onClose,
  playerId,
  onGroupJoined,
}: QRScannerModalProps) {
  const { colors } = useThemeStyles();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const joinGroupMutation = useJoinGroupByInviteCode();

  // Reset scanned state when modal opens
  useEffect(() => {
    if (visible) {
      setScanned(false);
      setIsProcessing(false);
    }
  }, [visible]);

  // Extract invite code from URL or raw code
  const extractInviteCode = useCallback((data: string): string | null => {
    // Check if it's a full URL (e.g., https://rallia.app/join/ABC12345)
    const urlMatch = data.match(/\/join\/([A-Z0-9]{8})/i);
    if (urlMatch) {
      return urlMatch[1].toUpperCase();
    }

    // Check if it's just the code (8 alphanumeric characters)
    const codeMatch = data.match(/^[A-Z0-9]{8}$/i);
    if (codeMatch) {
      return data.toUpperCase();
    }

    return null;
  }, []);

  const handleBarCodeScanned = useCallback(async ({ data }: { data: string }) => {
    if (scanned || isProcessing) return;

    setScanned(true);
    setIsProcessing(true);

    const inviteCode = extractInviteCode(data);

    if (!inviteCode) {
      Alert.alert(
        'Invalid QR Code',
        'This QR code is not a valid Rallia group invite.',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              setIsProcessing(false);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: onClose,
          },
        ]
      );
      return;
    }

    try {
      const result = await joinGroupMutation.mutateAsync({
        inviteCode,
        playerId,
      });

      if (result.success && result.groupId && result.groupName) {
        onClose();
        onGroupJoined(result.groupId, result.groupName);
      } else {
        Alert.alert(
          'Could Not Join',
          result.error || 'Failed to join the group. Please try again.',
          [
            {
              text: 'Try Again',
              onPress: () => {
                setScanned(false);
                setIsProcessing(false);
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: onClose,
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to join group',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              setIsProcessing(false);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: onClose,
          },
        ]
      );
    }
  }, [scanned, isProcessing, extractInviteCode, joinGroupMutation, playerId, onClose, onGroupJoined]);

  const handleRequestPermission = useCallback(async () => {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera access in your device settings to scan QR codes.',
        [
          { text: 'Cancel', style: 'cancel', onPress: onClose },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
  }, [requestPermission, onClose]);

  // Render permission request screen
  const renderPermissionRequest = () => (
    <View style={styles.permissionContainer}>
      <Ionicons name="camera-outline" size={64} color={colors.textMuted} />
      <Text weight="semibold" size="lg" style={{ color: colors.text, marginTop: 16, textAlign: 'center' }}>
        Camera Access Required
      </Text>
      <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
        To scan QR codes and join groups, we need access to your camera.
      </Text>
      <TouchableOpacity
        style={[styles.permissionButton, { backgroundColor: colors.primary }]}
        onPress={handleRequestPermission}
      >
        <Text weight="semibold" style={{ color: '#FFFFFF' }}>
          Allow Camera Access
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render scanner
  const renderScanner = () => (
    <View style={styles.scannerContainer}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay with scan frame */}
      <View style={styles.overlay}>
        {/* Top dark area */}
        <View style={styles.overlayTop} />
        
        {/* Middle row with scan frame */}
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          
          {/* Scan frame */}
          <View style={styles.scanFrame}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          
          <View style={styles.overlaySide} />
        </View>
        
        {/* Bottom dark area with instructions */}
        <View style={styles.overlayBottom}>
          <Text weight="medium" style={styles.instructionText}>
            {isProcessing ? 'Processing...' : 'Point at a group invite QR code'}
          </Text>
          {isProcessing && (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 12 }} />
          )}
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text weight="semibold" size="lg" style={styles.headerTitle}>
            Scan QR Code
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        {!permission?.granted ? renderPermissionRequest() : renderScanner()}
      </View>
    </Modal>
  );
}

const SCAN_FRAME_SIZE = 250;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 44,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  scannerContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTop: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCAN_FRAME_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanFrame: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#FFFFFF',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 4,
  },
  overlayBottom: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    paddingTop: 32,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
