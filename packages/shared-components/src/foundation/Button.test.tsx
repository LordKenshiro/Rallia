/**
 * Tests for Button component
 * 
 * Tests cover:
 * - All variants (primary, secondary, outline, ghost, link)
 * - All sizes (xs, sm, md, lg, xl)
 * - States (disabled, loading)
 * - Features (icons, fullWidth)
 * - Interaction (onPress)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Button } from './Button.native';

describe('Button', () => {
  describe('Rendering', () => {
    it('should render with children text', () => {
      const { getByText } = render(<Button>Click Me</Button>);
      expect(getByText('Click Me')).toBeTruthy();
    });

    it('should render with testID', () => {
      const { getByTestId } = render(
        <Button testID="test-button">Click Me</Button>
      );
      expect(getByTestId('test-button')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('should render primary variant by default', () => {
      const { getByText } = render(<Button>Primary</Button>);
      const button = getByText('Primary').parent;
      expect(button).toBeTruthy();
    });

    it('should render secondary variant', () => {
      const { getByText } = render(
        <Button variant="secondary">Secondary</Button>
      );
      expect(getByText('Secondary')).toBeTruthy();
    });

    it('should render outline variant', () => {
      const { getByText } = render(
        <Button variant="outline">Outline</Button>
      );
      expect(getByText('Outline')).toBeTruthy();
    });

    it('should render ghost variant', () => {
      const { getByText } = render(<Button variant="ghost">Ghost</Button>);
      expect(getByText('Ghost')).toBeTruthy();
    });

    it('should render link variant', () => {
      const { getByText } = render(<Button variant="link">Link</Button>);
      expect(getByText('Link')).toBeTruthy();
    });
  });

  describe('Sizes', () => {
    it('should render xs size', () => {
      const { getByText } = render(<Button size="xs">Extra Small</Button>);
      expect(getByText('Extra Small')).toBeTruthy();
    });

    it('should render sm size', () => {
      const { getByText } = render(<Button size="sm">Small</Button>);
      expect(getByText('Small')).toBeTruthy();
    });

    it('should render md size by default', () => {
      const { getByText } = render(<Button>Medium</Button>);
      expect(getByText('Medium')).toBeTruthy();
    });

    it('should render lg size', () => {
      const { getByText } = render(<Button size="lg">Large</Button>);
      expect(getByText('Large')).toBeTruthy();
    });

    it('should render xl size', () => {
      const { getByText } = render(<Button size="xl">Extra Large</Button>);
      expect(getByText('Extra Large')).toBeTruthy();
    });
  });

  describe('States', () => {
    it('should render disabled state', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Button disabled onPress={onPress}>
          Disabled
        </Button>
      );
      
      const button = getByText('Disabled').parent;
      fireEvent.press(button!);
      
      // Should not call onPress when disabled
      expect(onPress).not.toHaveBeenCalled();
    });

    it('should render loading state with spinner', () => {
      const { getByTestId, queryByText } = render(
        <Button loading testID="loading-button">
          Loading
        </Button>
      );
      
      // Button should be present
      expect(getByTestId('loading-button')).toBeTruthy();
      
      // Text should still be visible
      expect(queryByText('Loading')).toBeTruthy();
    });

    it('should disable interaction when loading', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Button loading onPress={onPress}>
          Loading
        </Button>
      );
      
      const button = getByText('Loading').parent;
      fireEvent.press(button!);
      
      // Should not call onPress when loading
      expect(onPress).not.toHaveBeenCalled();
    });

    it('should be disabled when both disabled and loading', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Button disabled loading onPress={onPress}>
          Both
        </Button>
      );
      
      const button = getByText('Both').parent;
      fireEvent.press(button!);
      
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('Icons', () => {
    it('should render with left icon', () => {
      const LeftIcon = () => <Text>←</Text>;
      const { getByText } = render(
        <Button leftIcon={<LeftIcon />}>With Left Icon</Button>
      );
      
      expect(getByText('←')).toBeTruthy();
      expect(getByText('With Left Icon')).toBeTruthy();
    });

    it('should render with right icon', () => {
      const RightIcon = () => <Text>→</Text>;
      const { getByText } = render(
        <Button rightIcon={<RightIcon />}>With Right Icon</Button>
      );
      
      expect(getByText('→')).toBeTruthy();
      expect(getByText('With Right Icon')).toBeTruthy();
    });

    it('should render with both left and right icons', () => {
      const LeftIcon = () => <Text>←</Text>;
      const RightIcon = () => <Text>→</Text>;
      const { getByText } = render(
        <Button leftIcon={<LeftIcon />} rightIcon={<RightIcon />}>
          Both Icons
        </Button>
      );
      
      expect(getByText('←')).toBeTruthy();
      expect(getByText('→')).toBeTruthy();
      expect(getByText('Both Icons')).toBeTruthy();
    });

    it('should hide icons when loading', () => {
      const LeftIcon = () => <Text>←</Text>;
      const RightIcon = () => <Text>→</Text>;
      const { queryByText, getByText } = render(
        <Button 
          loading 
          leftIcon={<LeftIcon />} 
          rightIcon={<RightIcon />}
        >
          Loading
        </Button>
      );
      
      // Icons should be hidden
      expect(queryByText('←')).toBeNull();
      expect(queryByText('→')).toBeNull();
      
      // Text should still be visible
      expect(getByText('Loading')).toBeTruthy();
    });
  });

  describe('Layout', () => {
    it('should render full width', () => {
      const { getByTestId } = render(
        <Button fullWidth testID="full-width-button">
          Full Width
        </Button>
      );
      
      const button = getByTestId('full-width-button');
      expect(button).toBeTruthy();
      expect(button.props.style).toContainEqual(
        expect.objectContaining({ width: '100%' })
      );
    });

    it('should accept custom styles', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <Button style={customStyle} testID="styled-button">
          Styled
        </Button>
      );
      
      const button = getByTestId('styled-button');
      expect(button.props.style).toContainEqual(
        expect.objectContaining(customStyle)
      );
    });

    it('should accept custom text styles', () => {
      const { getByText } = render(
        <Button textStyle={{ fontStyle: 'italic' }}>
          Custom Text
        </Button>
      );
      
      const text = getByText('Custom Text');
      expect(text.props.style).toContainEqual(
        expect.objectContaining({ fontStyle: 'italic' })
      );
    });
  });

  describe('Interaction', () => {
    it('should call onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Button onPress={onPress}>Press Me</Button>
      );
      
      const button = getByText('Press Me').parent;
      fireEvent.press(button!);
      
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Button disabled onPress={onPress}>
          Disabled
        </Button>
      );
      
      const button = getByText('Disabled').parent;
      fireEvent.press(button!);
      
      expect(onPress).not.toHaveBeenCalled();
    });

    it('should not call onPress when loading', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Button loading onPress={onPress}>
          Loading
        </Button>
      );
      
      const button = getByText('Loading').parent;
      fireEvent.press(button!);
      
      expect(onPress).not.toHaveBeenCalled();
    });

    it('should work without onPress handler', () => {
      const { getByText } = render(<Button>No Handler</Button>);
      
      const button = getByText('No Handler').parent;
      
      // Should not throw
      expect(() => fireEvent.press(button!)).not.toThrow();
    });
  });

  describe('Variant + Size Combinations', () => {
    it('should render primary large button', () => {
      const { getByText } = render(
        <Button variant="primary" size="lg">
          Primary Large
        </Button>
      );
      expect(getByText('Primary Large')).toBeTruthy();
    });

    it('should render secondary small button', () => {
      const { getByText } = render(
        <Button variant="secondary" size="sm">
          Secondary Small
        </Button>
      );
      expect(getByText('Secondary Small')).toBeTruthy();
    });

    it('should render ghost extra small button', () => {
      const { getByText } = render(
        <Button variant="ghost" size="xs">
          Ghost XS
        </Button>
      );
      expect(getByText('Ghost XS')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined onPress gracefully', () => {
      const { getByText } = render(<Button>Click Me</Button>);
      
      const button = getByText('Click Me').parent;
      expect(() => fireEvent.press(button!)).not.toThrow();
    });

    it('should handle empty children', () => {
      const { getByTestId } = render(<Button testID="empty-button">{''}</Button>);
      expect(getByTestId('empty-button')).toBeTruthy();
    });

    it('should handle complex children', () => {
      const { getByText } = render(
        <Button>
          <Text>Complex </Text>
          <Text>Children</Text>
        </Button>
      );
      
      expect(getByText('Complex ')).toBeTruthy();
      expect(getByText('Children')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible with testID', () => {
      const { getByTestId } = render(
        <Button testID="accessible-button">Accessible</Button>
      );
      
      expect(getByTestId('accessible-button')).toBeTruthy();
    });

    it('should indicate disabled state', () => {
      const { getByTestId } = render(
        <Button disabled testID="disabled-button">
          Disabled
        </Button>
      );
      
      const button = getByTestId('disabled-button');
      expect(button.props.disabled).toBe(true);
    });
  });
});
