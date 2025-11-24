# Overlay System Documentation

## Overview

We have created a flexible, reusable overlay system with two types of overlays for different use cases.

---

## Overlay Types

### 1. **Bottom Overlay** (`type="bottom"`)

Slides up from the bottom of the screen. Perfect for:

- Forms and data entry
- Authentication flows
- Detailed content views
- Multi-step processes

**Features:**

- Slides up animation
- Header with back/close buttons
- Title bar indicator
- White background
- Dismissible by tapping backdrop (optional)
- Can be closed by swiping down

**Example Usage:**

```tsx
<Overlay
  visible={visible}
  onClose={onClose}
  type="bottom"
  showBackButton={true}
  showCloseButton={true}
  dismissOnBackdropPress={true}
>
  {/* Your content here */}
</Overlay>
```

---

### 2. **Center Overlay** (`type="center"`)

Appears in the center of the screen. Perfect for:

- Alerts and confirmations
- Permission requests
- Quick decisions
- Important notifications

**Features:**

- Fade in animation
- Centered positioning
- No header (content manages its own layout)
- Supports dark background theme
- Optional backdrop dismissal
- Compact size (85% width, 80% max height)

**Example Usage:**

```tsx
<Overlay
  visible={visible}
  onClose={onClose}
  type="center"
  dismissOnBackdropPress={false}
  showBackButton={false}
  showCloseButton={false}
  darkBackground={true}
>
  {/* Your content here */}
</Overlay>
```

---

## Pre-built Overlay Components

### AuthOverlay (Bottom Type)

Sign-in overlay with social auth buttons and email input.

**Props:**

- `visible: boolean` - Show/hide overlay
- `onClose: () => void` - Called when overlay closes

**Usage:**

```tsx
import AuthOverlay from '../components/AuthOverlay';

<AuthOverlay visible={showAuth} onClose={() => setShowAuth(false)} />;
```

### LocationPermissionOverlay (Center Type)

Dark-themed permission request overlay.

**Props:**

- `visible: boolean` - Show/hide overlay
- `onAccept: () => void` - Called when user accepts
- `onRefuse: () => void` - Called when user refuses

**Usage:**

```tsx
import LocationPermissionOverlay from '../components/LocationPermissionOverlay';

<LocationPermissionOverlay
  visible={showPermission}
  onAccept={handleAccept}
  onRefuse={handleRefuse}
/>;
```

---

## Creating Custom Overlays

### For Bottom Overlays:

```tsx
import Overlay from './Overlay';

const MyCustomOverlay = ({ visible, onClose }) => {
  return (
    <Overlay visible={visible} onClose={onClose} type="bottom">
      <View style={{ paddingVertical: 20 }}>
        <Text>My Custom Content</Text>
        {/* Your content */}
      </View>
    </Overlay>
  );
};
```

### For Center Overlays:

```tsx
import Overlay from './Overlay';

const MyAlertOverlay = ({ visible, onClose }) => {
  return (
    <Overlay
      visible={visible}
      onClose={onClose}
      type="center"
      darkBackground={true}
      dismissOnBackdropPress={false}
    >
      <View style={{ alignItems: 'center' }}>
        <Text style={{ color: '#fff' }}>Alert Message</Text>
        <Button onPress={onClose}>OK</Button>
      </View>
    </Overlay>
  );
};
```

---

## Props Reference

### Overlay Component

| Prop                     | Type                   | Default      | Description                        |
| ------------------------ | ---------------------- | ------------ | ---------------------------------- |
| `visible`                | `boolean`              | **required** | Controls overlay visibility        |
| `onClose`                | `() => void`           | **required** | Callback when overlay should close |
| `children`               | `ReactNode`            | **required** | Content to display in overlay      |
| `type`                   | `'bottom' \| 'center'` | `'bottom'`   | Overlay display type               |
| `title`                  | `string`               | `undefined`  | Title text (bottom only)           |
| `showBackButton`         | `boolean`              | `true`       | Show back button (bottom only)     |
| `showCloseButton`        | `boolean`              | `true`       | Show close button (bottom only)    |
| `dismissOnBackdropPress` | `boolean`              | `true`       | Allow backdrop tap to close        |
| `darkBackground`         | `boolean`              | `false`      | Use dark theme for content area    |

---

## Styling Tips

### Bottom Overlay Content:

- Content area has 20px horizontal padding by default
- Add vertical padding to your content container
- Use `paddingVertical: 20` for spacing

### Center Overlay Content:

- Content is automatically centered
- Use white text with `darkBackground={true}`
- Keep content compact (fits 85% width)
- Center align text and elements

---

## Examples in the App

1. **Home Screen** - AuthOverlay (bottom type)
   - Click "Sign In" button
   - See authentication form

2. **Map Screen** - LocationPermissionOverlay (center type)
   - Navigate to Map tab
   - See permission request dialog

---

## Best Practices

1. **Use bottom overlays for:**
   - Multi-field forms
   - Long content
   - Navigation flows

2. **Use center overlays for:**
   - Yes/No decisions
   - Permissions
   - Quick alerts
   - Single actions

3. **Always provide a way to close:**
   - Set `dismissOnBackdropPress={true}` OR
   - Include a close/cancel button in content

4. **Consider user context:**
   - Don't show critical overlays during important actions
   - Use `dismissOnBackdropPress={false}` for required actions
