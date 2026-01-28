/**
 * CourtBookingSheet Component
 * Bottom sheet for booking a local (org-managed) court slot.
 * Integrates with Stripe for payment.
 * UI follows MatchDetailSheet patterns for consistency.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Text, useToast } from '@rallia/shared-components';
import { useStripe } from '@stripe/stripe-react-native';
import { spacingPixels, radiusPixels, primary } from '@rallia/design-system';
import type { FormattedSlot, CourtOption } from '@rallia/shared-hooks';
import type { Court } from '@rallia/shared-types';
import type { FacilityWithDetails } from '@rallia/shared-services';
import { createMobileBooking, Logger } from '@rallia/shared-services';
import { lightHaptic, mediumHaptic, selectionHaptic } from '@rallia/shared-utils';
import type { TranslationKey, TranslationOptions } from '../../../hooks';

interface CourtBookingSheetProps {
  visible: boolean;
  onClose: () => void;
  facility: FacilityWithDetails;
  slot: FormattedSlot;
  courts: Court[];
  colors: {
    card: string;
    text: string;
    textMuted: string;
    primary: string;
    border: string;
    background: string;
    error: string;
  };
  isDark?: boolean;
  t: (key: TranslationKey, options?: TranslationOptions) => string;
}

/**
 * Extended theme colors for the booking sheet
 */
interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  border: string;
  iconMuted: string;
}

/**
 * Format price (already in dollars) to display string
 */
function formatPrice(price: number | undefined): string {
  if (price === undefined || price === 0) return 'Free';
  return `$${price.toFixed(2)}`;
}

/**
 * Convert 12-hour time format to 24-hour HH:MM:SS format
 * Examples: "2:00 PM" -> "14:00:00", "11:00 AM" -> "11:00:00"
 */
function convertTo24Hour(time12h: string): string {
  const match = time12h.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    // If already in 24-hour format or unrecognized, return as-is with seconds
    return time12h.includes(':') && time12h.length >= 5
      ? time12h.includes(':00:00')
        ? time12h
        : `${time12h}:00`
      : time12h;
  }

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
}

export default function CourtBookingSheet({
  visible,
  onClose,
  facility,
  slot,
  courts,
  colors,
  isDark = false,
  t,
}: CourtBookingSheetProps) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const toast = useToast();
  const sheetRef = useRef<BottomSheetModal>(null);

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Extended theme colors matching MatchDetailSheet pattern
  const themeColors = useMemo<ThemeColors>(
    () => ({
      background: colors.background,
      card: colors.card,
      text: colors.text,
      textMuted: colors.textMuted,
      primary: colors.primary,
      primaryLight: isDark ? primary[900] : primary[50],
      border: colors.border,
      iconMuted: colors.textMuted,
    }),
    [colors, isDark]
  );

  // Single snap point at 90% - matches MatchDetailSheet
  const snapPoints = useMemo(() => ['90%'], []);

  // Sync visible prop with sheet presentation
  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  // Custom backdrop with opacity
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  // Handle sheet dismiss with haptic
  const handleSheetDismiss = useCallback(() => {
    selectionHaptic();
    onClose();
  }, [onClose]);

  // Get available court options from the slot (memoized to prevent hook dependency issues)
  const courtOptions: CourtOption[] = useMemo(() => slot.courtOptions || [], [slot.courtOptions]);

  // Check if payments are enabled
  const paymentsEnabled = facility.paymentsEnabled ?? false;

  // Helper to get court option by court ID
  const getCourtOption = useCallback(
    (courtId: string): CourtOption | undefined => {
      return courtOptions.find(opt => opt.courtId === courtId);
    },
    [courtOptions]
  );

  // Filter courts to only show those available for this specific time slot
  // When payments aren't enabled, only show courts that are free
  const availableCourts = useMemo(() => {
    // If no court options, we can't determine which courts are available
    if (!courtOptions.length) {
      // If payments are enabled, show all courts
      // If not, we have no price info so show nothing
      return paymentsEnabled ? courts : [];
    }

    // Build a map of courtId -> price for quick lookup
    const courtIdToPriceMap = new Map<string, number>();
    for (const opt of courtOptions) {
      if (opt.courtId) {
        courtIdToPriceMap.set(opt.courtId, opt.price ?? 0);
      }
    }

    // Filter courts that have a court option
    let filtered = courts.filter(court => courtIdToPriceMap.has(court.id));

    // If payments aren't enabled, only show FREE courts (price === 0)
    if (!paymentsEnabled) {
      filtered = filtered.filter(court => {
        const price = courtIdToPriceMap.get(court.id);
        return price === 0;
      });
    }

    return filtered;
  }, [courts, courtOptions, paymentsEnabled]);

  // Get count of unavailable courts (paid courts when payments not enabled)
  const unavailablePaidCourtCount = useMemo(() => {
    if (paymentsEnabled || !courtOptions.length) return 0;

    // Count court options with courtId that have a non-zero price
    let paidCount = 0;
    for (const opt of courtOptions) {
      if (opt.courtId && (opt.price ?? 0) > 0) {
        paidCount++;
      }
    }
    return paidCount;
  }, [courtOptions, paymentsEnabled]);

  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);

  // Reset and set initial selected court when sheet opens or available courts change
  useEffect(() => {
    if (!visible) {
      // Reset when sheet closes
      setSelectedCourt(null);
      return;
    }

    // When sheet opens, select the first available court if only one is available
    // or keep current selection if it's still valid
    if (availableCourts.length === 0) {
      setSelectedCourt(null);
    } else if (availableCourts.length === 1) {
      // Auto-select if only one court available
      setSelectedCourt(availableCourts[0]);
    } else {
      // Multiple courts available - check if current selection is still valid
      if (selectedCourt && !availableCourts.find(c => c.id === selectedCourt.id)) {
        // Current selection is no longer valid, clear it
        setSelectedCourt(null);
      } else if (!selectedCourt) {
        // No selection yet, but multiple available - don't auto-select
        setSelectedCourt(null);
      }
      // Otherwise keep current selection if it's valid
    }
    // Note: selectedCourt intentionally excluded - we only want to run this effect when
    // visibility or available courts change, not when selection changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, availableCourts]);

  // Handle court selection
  const handleSelectCourt = useCallback((court: Court) => {
    lightHaptic();
    setSelectedCourt(court);
  }, []);

  // Price to display - defined before handleBook since it uses it
  const displayPrice = useMemo(() => {
    // Find matching court option for price
    const courtOption = courtOptions.find(opt => opt.courtId === selectedCourt?.id);
    // If we have a court option, use its price
    // Otherwise, if no court is selected yet, fall back to slot.price
    // If a court is selected but no option found, show 0 (shouldn't happen after filtering)
    if (courtOption) {
      return courtOption.price ?? 0;
    }
    if (!selectedCourt) {
      // No court selected - show lowest available price when payments not enabled
      if (!paymentsEnabled && courtOptions.length > 0) {
        const freeCourts = courtOptions.filter(opt => (opt.price ?? 0) === 0);
        if (freeCourts.length > 0) {
          return 0; // Show free since there are free courts
        }
      }
      return slot.price;
    }
    // Court selected but no option found - shouldn't happen, show 0
    return 0;
  }, [courtOptions, selectedCourt, slot.price, paymentsEnabled]);

  // Handle booking
  const handleBook = useCallback(async () => {
    if (!selectedCourt) return;

    // Validate that payments are enabled if this is a paid slot
    const slotPrice = displayPrice ?? 0;
    if (!facility.paymentsEnabled && slotPrice > 0) {
      toast.error(t('facilityDetail.paymentsNotAvailable'));
      return;
    }

    mediumHaptic();
    setIsLoading(true);

    try {
      // Format date from slot
      const bookingDate = slot.datetime.toISOString().split('T')[0];
      // Convert 12-hour display times to 24-hour format (HH:MM:SS)
      const startTime = convertTo24Hour(slot.time);
      const endTime = convertTo24Hour(slot.endTime);

      Logger.info('Starting mobile booking', {
        courtId: selectedCourt.id,
        bookingDate,
        startTime,
        endTime,
      });

      // Create booking and get Stripe client secret
      const result = await createMobileBooking({
        courtId: selectedCourt.id,
        bookingDate,
        startTime,
        endTime,
      });

      // If payment is required, show Stripe PaymentSheet
      if (result.clientSecret) {
        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: result.clientSecret,
          merchantDisplayName: 'Rallia',
        });

        if (initError) {
          throw new Error(initError.message);
        }

        const { error: paymentError } = await presentPaymentSheet();

        if (paymentError) {
          if (paymentError.code === 'Canceled') {
            // User cancelled - don't show error
            setIsLoading(false);
            return;
          }
          throw new Error(paymentError.message);
        }
      }

      // Success!
      setBookingSuccess(true);
      toast.success(t('booking.success.title'));

      // Close sheet after short delay
      setTimeout(() => {
        sheetRef.current?.dismiss();
        setBookingSuccess(false);
      }, 1500);
    } catch (error) {
      Logger.error('Mobile booking failed', error as Error);
      toast.error((error as Error).message || 'Booking failed');
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedCourt,
    slot,
    displayPrice,
    facility.paymentsEnabled,
    initPaymentSheet,
    presentPaymentSheet,
    t,
    toast,
  ]);

  // Format the date for display
  const formattedDate = useMemo(() => {
    return slot.datetime.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, [slot.datetime]);

  // Check if price is free
  const isFree = displayPrice === 0 || displayPrice === undefined;

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: themeColors.border }]}
      backgroundStyle={[styles.sheetBackground, { backgroundColor: themeColors.background }]}
      bottomInset={0}
      onDismiss={handleSheetDismiss}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      enableDismissOnClose
      animateOnMount
      enableHandlePanningGesture
    >
      <BottomSheetView style={styles.sheetContent}>
        {/* Header - matches MatchDetailSheet pattern */}
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <View style={styles.headerTop}>
            <View style={styles.headerTitleSection}>
              <Text size="lg" weight="bold" color={themeColors.text}>
                {t('booking.confirmBooking')}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: themeColors.card }]}
                onPress={handleSheetDismiss}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={themeColors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Scrollable Content */}
        <BottomSheetScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Booking Details Section */}
          <View style={[styles.section, { borderBottomColor: themeColors.border }]}>
            {/* Facility name */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="location" size={18} color={themeColors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text size="base" weight="semibold" color={themeColors.text}>
                  {facility.name}
                </Text>
              </View>
            </View>

            {/* Date */}
            <View style={[styles.infoRow, styles.infoRowSpacing]}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="calendar" size={18} color={themeColors.iconMuted} />
              </View>
              <View style={styles.infoContent}>
                <Text size="sm" color={themeColors.text}>
                  {formattedDate}
                </Text>
              </View>
            </View>

            {/* Time with duration badge */}
            <View style={[styles.infoRow, styles.infoRowSpacing]}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="time" size={18} color={themeColors.iconMuted} />
              </View>
              <View style={styles.infoContent}>
                <View style={styles.timeRow}>
                  <Text size="sm" color={themeColors.text}>
                    {slot.time} - {slot.endTime}
                  </Text>
                  <View
                    style={[styles.durationBadge, { backgroundColor: themeColors.primaryLight }]}
                  >
                    <Text size="xs" weight="medium" color={themeColors.primary}>
                      1h
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Price */}
            <View style={[styles.infoRow, styles.infoRowSpacing]}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="wallet" size={18} color={themeColors.iconMuted} />
              </View>
              <View style={styles.infoContent}>
                <Text size="sm" weight="semibold" color={isFree ? '#10b981' : themeColors.text}>
                  {formatPrice(displayPrice)}
                </Text>
              </View>
            </View>
          </View>

          {/* Court Selection Section */}
          {availableCourts.length > 1 && (
            <View style={[styles.section, { borderBottomColor: themeColors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="tennisball" size={18} color={themeColors.primary} />
                <Text
                  size="base"
                  weight="semibold"
                  color={themeColors.text}
                  style={styles.sectionTitle}
                >
                  {t('booking.selectCourt')}
                </Text>
              </View>

              <View style={styles.courtList}>
                {availableCourts.map(court => {
                  const isSelected = selectedCourt?.id === court.id;
                  const courtOption = getCourtOption(court.id);
                  const courtPrice = courtOption?.price ?? slot.price ?? 0;
                  const isCourtFree = courtPrice === 0;

                  return (
                    <TouchableOpacity
                      key={court.id}
                      style={[
                        styles.courtCard,
                        {
                          backgroundColor: isSelected ? themeColors.primaryLight : themeColors.card,
                          borderColor: isSelected ? themeColors.primary : themeColors.border,
                        },
                      ]}
                      onPress={() => handleSelectCourt(court)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.courtInfo}>
                        <Text
                          size="sm"
                          weight={isSelected ? 'semibold' : 'regular'}
                          color={themeColors.text}
                        >
                          {court.name || `Court ${court.court_number}`}
                        </Text>
                        <Text size="xs" color={themeColors.textMuted}>
                          {t('booking.available')}
                        </Text>
                      </View>
                      <View style={styles.courtPriceContainer}>
                        <Text
                          size="sm"
                          weight="bold"
                          color={isCourtFree ? '#10b981' : themeColors.text}
                        >
                          {isCourtFree ? t('facilityDetail.free') : `$${courtPrice.toFixed(0)}`}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={22} color={themeColors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Notice about unavailable paid courts */}
              {unavailablePaidCourtCount > 0 && (
                <View style={styles.unavailableNotice}>
                  <Ionicons
                    name="information-circle-outline"
                    size={14}
                    color={themeColors.textMuted}
                  />
                  <Text size="xs" color={themeColors.textMuted}>
                    {t('booking.paidCourtsUnavailable', { count: unavailablePaidCourtCount })}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Single court info when only one available */}
          {availableCourts.length === 1 && selectedCourt && (
            <View style={[styles.section, { borderBottomColor: themeColors.border }]}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="tennisball" size={18} color={themeColors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text size="sm" weight="medium" color={themeColors.text}>
                    {selectedCourt.name || `Court ${selectedCourt.court_number}`}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Sticky Footer - matches MatchDetailSheet pattern */}
          <View
            style={[
              styles.stickyFooter,
              { backgroundColor: themeColors.background, borderTopColor: themeColors.border },
            ]}
          >
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.bookButton,
                  {
                    backgroundColor: selectedCourt ? themeColors.primary : themeColors.textMuted,
                    opacity: isLoading || bookingSuccess ? 0.7 : 1,
                  },
                ]}
                onPress={handleBook}
                disabled={!selectedCourt || isLoading || bookingSuccess}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : bookingSuccess ? (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text size="base" weight="semibold" color="#fff">
                      {t('booking.success.title')}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text size="base" weight="semibold" color="#fff">
                      {t('booking.bookNow')}
                    </Text>
                    {displayPrice !== undefined && displayPrice > 0 && (
                      <Text size="base" weight="bold" color="#fff">
                        {' '}
                        • {formatPrice(displayPrice)}
                      </Text>
                    )}
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BottomSheetScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  // Sheet base styles
  sheetBackground: {
    borderTopLeftRadius: radiusPixels['2xl'],
    borderTopRightRadius: radiusPixels['2xl'],
  },
  handleIndicator: {
    width: spacingPixels[10],
  },
  sheetContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacingPixels[10],
  },

  // Header - matches MatchDetailSheet
  header: {
    paddingHorizontal: spacingPixels[5],
    paddingTop: spacingPixels[2],
    paddingBottom: spacingPixels[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleSection: {
    flex: 1,
    marginRight: spacingPixels[3],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sections - matches MatchDetailSheet
  section: {
    paddingHorizontal: spacingPixels[5],
    paddingVertical: spacingPixels[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingPixels[3],
  },
  sectionTitle: {
    marginLeft: spacingPixels[2],
  },

  // Info rows - matches MatchDetailSheet
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoRowSpacing: {
    marginTop: spacingPixels[3],
  },
  infoIconContainer: {
    width: spacingPixels[8],
    alignItems: 'center',
    paddingTop: spacingPixels[0.5],
  },
  infoContent: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[2],
  },
  durationBadge: {
    paddingHorizontal: spacingPixels[2],
    paddingVertical: spacingPixels[0.5],
    borderRadius: radiusPixels.full,
  },

  // Court selection
  courtList: {
    gap: spacingPixels[2],
  },
  courtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[3],
    borderRadius: radiusPixels.lg,
    borderWidth: 1.5,
  },
  courtInfo: {
    flex: 1,
    gap: 2,
  },
  courtPriceContainer: {
    marginRight: spacingPixels[3],
  },
  unavailableNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[1.5],
    marginTop: spacingPixels[3],
  },

  // Sticky Footer - matches MatchDetailSheet
  stickyFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[4],
    paddingBottom: spacingPixels[10],
    gap: spacingPixels[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  actionButtonsContainer: {
    flex: 1,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    gap: spacingPixels[2],
  },
});
