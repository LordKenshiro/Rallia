import { Platform } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';

/**
 * Returns safe area edges to apply for SafeAreaView.
 * On iOS we apply none (nav/stack handles safe area); on Android we use the given edges.
 */
export function getSafeAreaEdges(edges: readonly Edge[]): Edge[] {
  return Platform.OS === 'ios' ? [] : [...edges];
}
