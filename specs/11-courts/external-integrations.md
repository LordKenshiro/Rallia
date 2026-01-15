# External Integrations

## Overview

Integrate with third-party court reservation systems to provide seamless booking.

## Integration Types

### Deep Integration

Full API integration allowing:

- View real-time availability
- Complete booking in-app
- Receive confirmation in-app
- Manage cancellations

**Target systems:**

- Loisirs Montréal
- Other municipal systems with APIs

### Link Integration

Redirect user to external system:

- Show availability (if API available)
- Open external booking page
- Pre-fill information where possible

**For systems without full API access**

### Info Only

For courts without any booking system:

- Display court information
- Phone number/contact
- No automated booking

## Loisirs Montréal Integration

### Reference

See Spin app for implementation pattern.

### Capabilities

| Feature            | Supported        |
| ------------------ | ---------------- |
| View availability  | ✅ Yes           |
| Make reservation   | ✅ Yes (via API) |
| Cancel reservation | ✅ Yes           |
| Payment            | ❌ External      |

### User Flow

1. User selects court
2. Sees real-time availability from Loisirs API
3. Selects time slot
4. Confirms booking
5. Redirected to payment (if required)
6. Booking confirmed in Rallia

## Other Municipal Systems

### Target Cities

| City        | System           | Integration Status |
| ----------- | ---------------- | ------------------ |
| Montreal    | Loisirs Montréal | Priority           |
| Toronto     | TBD              | Research needed    |
| Vancouver   | TBD              | Research needed    |
| Ottawa      | TBD              | Research needed    |
| Calgary     | TBD              | Research needed    |
| Edmonton    | TBD              | Research needed    |
| Quebec City | TBD              | Research needed    |

### Integration Approach

1. Research available APIs
2. Contact for partnership if needed
3. Implement deep integration where possible
4. Fall back to link integration otherwise

## Private Clubs (Rallia Native)

Courts from Club Portal have full native integration:

- Real-time availability
- In-app booking
- In-app management
- Future: In-app payment

See [Club Portal](../10-club-portal/README.md).

## Scalability

### Adding New Systems

Architecture should support:

- Easy addition of new booking systems
- Adapter pattern for different APIs
- Graceful degradation to link/info modes

### Data Normalization

All external court data normalized to Rallia format:

- Consistent court objects
- Unified availability format
- Standard booking interface
