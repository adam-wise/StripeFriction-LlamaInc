# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Start production server
npm start
```

Server runs on `http://localhost:3000` by default.

## Architecture Overview

This is a **peer-to-peer tractor rental marketplace** with integrated Stripe Checkout and A/B testing capabilities. The architecture consists of:

### Frontend (Static Files)
- **index.html**: Main landing page with booking form
- **booking.js**: Core client-side logic handling pricing calculations, A/B testing, and Stripe integration
- **success.html**: Post-payment confirmation page
- **styles.css**: All styling including responsive design

### Backend (Express Server)
- **server.js**: Express API server that creates Stripe checkout sessions and handles webhooks

### Pricing & A/B Testing System

The application implements a sophisticated dual-configuration system:

**Price Sets**: Two identical configuration objects exist in both `booking.js` (frontend) and `server.js` (backend):
- **Set A (Control)**: $400 first night, $50 additional nights, 15% platform fee, 20% deposit
- **Set B (Test)**: $350 first night, $60 additional nights, 18% platform fee, 15% deposit

**A/B Testing Logic**:
1. URL parameter override (`?pricing=a` or `?pricing=b`)
2. localStorage persistence for consistent user experience
3. Random 50/50 assignment for new users
4. GTM analytics integration ready

**Pricing Calculation Flow**:
1. User selects rental duration on frontend
2. `booking.js` calculates display prices using assigned price set
3. Form submission sends pricing data to backend
4. `server.js` recreates pricing using same price set configuration
5. Dynamic Stripe checkout session created with multiple line items

### Stripe Integration Architecture

**Dynamic Line Items Strategy**: Instead of pre-configured Stripe products for each duration, the system uses:
- Base Stripe Products: "First Night" and "Additional Night" for each price set
- Dynamic line item creation: 1x first night + (n-1)x additional nights
- Calculated fees added as one-time price_data items

**Key Configuration Points**:
- Stripe Price IDs must be updated in both `PRICE_SETS` (booking.js) and `STRIPE_PRICES` (server.js)
- Publishable key in `booking.js`
- Secret key in `server.js`

## Essential Setup Requirements

Before the application can process payments:

1. **Create Stripe Products**: 4 total products needed (2 price sets × 2 rental types)
2. **Update Price IDs**: Replace placeholder IDs in both frontend and backend configuration objects
3. **Add Stripe Keys**: Update both publishable and secret keys
4. **Webhook Configuration**: `/webhook` endpoint available for payment confirmations

## Code Synchronization Critical Points

When modifying pricing logic, these configurations must stay synchronized:
- `PRICE_SETS` in `booking.js` (lines 5-20)
- `STRIPE_PRICES` in `server.js` (lines 10-23)
- Pricing calculation logic in `PricingCalculator.calculate()` method
- Server-side pricing recalculation in `/create-checkout-session` endpoint

## A/B Testing URL Parameters

- `?pricing=a` - Force Control pricing
- `?pricing=b` - Force Test pricing
- No parameter - Random assignment with localStorage persistence