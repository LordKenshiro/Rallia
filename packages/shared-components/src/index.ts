/**
 * Shared Components - Barrel Export
 */

// Foundation Components
export { Button } from './foundation/Button.native';
export { Text } from './foundation/Text.native';
export { Heading } from './foundation/Heading.native';

export type { ButtonProps } from './foundation/Button.native';
export type { TextProps } from './foundation/Text.native';
export type { HeadingProps } from './foundation/Heading.native';

// Form Components
export { Input } from './forms/Input.native';
export { Select } from './forms/Select.native';

export type { InputProps } from './forms/Input.native';
export type { SelectProps, SelectOption } from './forms/Select.native';

// Layout Components
export { Container } from './layout/Container.native';
export { Stack, VStack, HStack } from './layout/Stack.native';
export { Card } from './layout/Card.native';
export { Divider } from './layout/Divider.native';
export { Spacer } from './layout/Spacer.native';

export type { ContainerProps } from './layout/Container.native';
export type { StackProps } from './layout/Stack.native';
export type { CardProps } from './layout/Card.native';
export type { DividerProps } from './layout/Divider.native';
export type { SpacerProps } from './layout/Spacer.native';

// Feedback Components
export { Spinner } from './feedback/Spinner.native';
export { ErrorMessage } from './feedback/ErrorMessage.native';
export { Badge } from './feedback/Badge.native';
export { ErrorBoundary } from './ErrorBoundary';

export type { SpinnerProps } from './feedback/Spinner.native';
export type { ErrorMessageProps } from './feedback/ErrorMessage.native';
export type { BadgeProps } from './feedback/Badge.native';

// Base Components
export { default as Overlay } from './Overlay.native';
export { default as MatchCard } from './MatchCard.native';
export { default as AppHeader } from './AppHeader.native';
export { default as SettingsModal } from './SettingsModal.native';

// Overlays
export { PermissionOverlay, LocationPermissionOverlay, CalendarAccessOverlay } from './overlays';

export type { PermissionType } from './overlays';

// Theme
export { colors, typography, spacing } from './theme';
