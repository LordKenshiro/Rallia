/**
 * CourtBookingSheet Component
 * Bottom sheet for booking a local (org-managed) court slot.
 * Integrates with Stripe for payment.
 * UI follows UserProfile sheets (PlayerInformationOverlay, PlayerAvailabilitiesOverlay) for consistency.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import ActionSheet, { SheetManager, SheetProps, ScrollView } from 'react-native-actions-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Text, useToast } from '@rallia/shared-components';
import { useStripe } from '@stripe/stripe-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { spacingPixels, radiusPixels, primary } from '@rallia/design-system';
import { courtAvailabilityKeys, type FormattedSlot, type CourtOption } from '@rallia/shared-hooks';
import type { Court } from '@rallia/shared-types';
import type { FacilityWithDetails } from '@rallia/shared-services';
import { createMobileBooking, Logger } from '@rallia/shared-services';
import { lightHaptic, mediumHaptic, selectionHaptic } from '@rallia/shared-utils';
import { useThemeStyles, useTranslation, type TranslationKey } from '../../../hooks';

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

export function CourtBookingActionSheet({ payload }: SheetProps<'court-booking'>) {
  const facility = payload?.facility as FacilityWithDetails;
  const slot = payload?.slot as FormattedSlot;
  const courts = (payload?.courts ?? []) as Court[];
  const onSuccess = payload?.onSuccess as
    | ((data: { facilityId: string; courtId: string; courtNumber: number | null }) => void)
    | undefined;

  const { colors, isDark } = useThemeStyles();
  const { t } = useTranslation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const toast = useToast();
  const queryClient = useQueryClient();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Extended theme colors matching MatchDetailSheet pattern
  const themeColors = useMemo<ThemeColors>(
    () => ({
      background: colors.background,
      card: colors.cardBackground,
      text: colors.text,
      textMuted: colors.textMuted,
      primary: colors.primary,
      primaryLight: isDark ? primary[900] : primary[50],
      border: colors.border,
      iconMuted: colors.textMuted,
    }),
    [colors, isDark]
  );

  // Handle sheet dismiss with haptic
  const handleClose = useCallback(() => {
    selectionHaptic();
    SheetManager.hide('court-booking');
  }, []);

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

  // Set initial selected court when available courts change (sheet opened or payload updated)
  useEffect(() => {
    if (availableCourts.length === 0) {
      setSelectedCourt(null);
    } else if (availableCourts.length === 1) {
      setSelectedCourt(availableCourts[0]);
    } else {
      setSelectedCourt(prev => (prev && availableCourts.some(c => c.id === prev.id) ? prev : null));
    }
  }, [availableCourts]);

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
      // Use local calendar date so evening slots (e.g. 8pm–11pm) don't send tomorrow's UTC date
      const y = slot.datetime.getFullYear();
      const m = String(slot.datetime.getMonth() + 1).padStart(2, '0');
      const d = String(slot.datetime.getDate()).padStart(2, '0');
      const bookingDate = `${y}-${m}-${d}`;
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

      // Call onSuccess callback with booking data
      if (onSuccess) {
        onSuccess({
          facilityId: facility.id,
          courtId: selectedCourt.id,
          courtNumber: selectedCourt.court_number ?? null,
        });
      }

      // Invalidate court availability so the list refetches and the booked slot is removed
      queryClient.invalidateQueries({ queryKey: courtAvailabilityKeys.facility(facility.id) });

      // Close sheet after short delay
      setTimeout(() => {
        SheetManager.hide('court-booking');
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
    facility.id,
    facility.paymentsEnabled,
    initPaymentSheet,
    presentPaymentSheet,
    onSuccess,
    queryClient,
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

  if (!facility || !slot) return null;

  return (
    <ActionSheet
      gestureEnabled
      containerStyle={[styles.sheetBackground, { backgroundColor: colors.card }]}
      indicatorStyle={[styles.handleIndicator, { backgroundColor: themeColors.border }]}
    >
      <View style={styles.modalContent}>
        {/* Header - centered title, close button absolute right (matches UserProfile sheets) */}
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <View style={styles.headerCenter}>
            <Text weight="semibold" size="lg" style={{ color: themeColors.text }}>
              {t('booking.confirmBooking')}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={themeColors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView
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
        </ScrollView>

        {/* Sticky Footer - outside ScrollView (matches UserProfile sheets) */}
        <View style={[styles.footer, { borderTopColor: themeColors.border }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
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
                <Text size="lg" weight="semibold" color="#fff">
                  {t('booking.success.title')}
                </Text>
              </>
            ) : (
              <>
                <Text size="lg" weight="semibold" color="#fff">
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
    </ActionSheet>
  );
}

// Keep old export for backwards compatibility during migration
export default CourtBookingActionSheet;

const styles = StyleSheet.create({
  // Sheet base styles
  sheetBackground: {
    flex: 1,
    borderTopLeftRadius: radiusPixels['2xl'],
    borderTopRightRadius: radiusPixels['2xl'],
  },
  handleIndicator: {
    width: spacingPixels[10],
    height: 4,
    borderRadius: 4,
    alignSelf: 'center',
  },
  modalContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacingPixels[4],
    paddingBottom: spacingPixels[4],
  },

  // Header - centered title, close absolute right (matches UserProfile sheets)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacingPixels[4],
    borderBottomWidth: 1,
    position: 'relative',
  },
  headerCenter: {
    alignItems: 'center',
  },
  closeButton: {
    padding: spacingPixels[1],
    position: 'absolute',
    right: spacingPixels[4],
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

  // Footer - sticky at bottom (matches MatchCreationWizard)
  footer: {
    padding: spacingPixels[4],
    borderTopWidth: 1,
    paddingBottom: spacingPixels[4],
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    gap: spacingPixels[2],
  },
});
