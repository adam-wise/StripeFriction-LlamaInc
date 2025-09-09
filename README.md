# Llama Inc - Tractor Rental Marketplace

A peer-to-peer tractor rental marketplace with Stripe Checkout integration and A/B testing capabilities.

## Features

- **Dynamic Pricing Calculator**: Calculates rental costs based on duration
- **A/B Testing**: Test different pricing strategies with automatic user assignment
- **Stripe Integration**: Secure checkout with dynamic line items
- **Responsive Design**: Works on desktop and mobile
- **Success Flow**: Professional confirmation page after payment

## Pricing Structure

- **First Night**: $400
- **Additional Nights**: $50 each
- **Platform Fee**: 15% (configurable per A/B test)
- **Security Deposit**: 20% of pre-tax total (refundable)

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Stripe

#### Create Products in Stripe Dashboard:
**Price Set A (Control):**
- Product: "First Night Rental" → Price: $400 → Copy Price ID
- Product: "Additional Night Rental" → Price: $50 → Copy Price ID

**Price Set B (Test):**
- Product: "First Night Rental (Test)" → Price: $350 → Copy Price ID  
- Product: "Additional Night Rental (Test)" → Price: $60 → Copy Price ID

#### Update Configuration Files:
1. **booking.js** - Replace placeholder Price IDs:
```javascript
const PRICE_SETS = {
    A: {
        firstNight: 'price_YOUR_CONTROL_FIRST_NIGHT_ID',
        additionalNight: 'price_YOUR_CONTROL_ADDITIONAL_NIGHT_ID',
        // ...
    },
    B: {
        firstNight: 'price_YOUR_TEST_FIRST_NIGHT_ID', 
        additionalNight: 'price_YOUR_TEST_ADDITIONAL_NIGHT_ID',
        // ...
    }
};
```

2. **booking.js** - Add your Stripe Publishable Key:
```javascript
const stripe = Stripe('pk_test_YOUR_PUBLISHABLE_KEY_HERE');
```

3. **server.js** - Add your Stripe Secret Key:
```javascript
const stripe = require('stripe')('sk_test_YOUR_SECRET_KEY_HERE');
```

4. **server.js** - Update Price IDs in STRIPE_PRICES object

### 3. Run the Application
```bash
npm start
```

Visit `http://localhost:3000` to view your site.

## A/B Testing

The system automatically assigns users to pricing test A or B:

### Force Specific Pricing:
- `?pricing=a` - Force Control pricing
- `?pricing=b` - Force Test pricing

### User Assignment:
- Random 50/50 split on first visit
- Assignment stored in localStorage for consistency
- Can be tracked via analytics (GTM integration ready)

## File Structure

```
├── index.html          # Main landing page
├── booking.js          # Frontend pricing calculator & Stripe integration
├── server.js           # Backend API for checkout session creation
├── styles.css          # All styling including booking form
├── success.html        # Post-payment confirmation page
├── package.json        # Node.js dependencies
└── README.md          # This file
```

## Customization

### Adding New Price Sets:
1. Create new products in Stripe
2. Add new price set to `PRICE_SETS` in both files
3. Update A/B testing logic in `determineABTest()`

### Modifying Pricing Rules:
- Platform fee rates: Update `platformFeeRate` in price sets
- Deposit rates: Update `depositRate` in price sets
- Base prices: Update Stripe product prices

## Production Deployment

1. Replace test Stripe keys with live keys
2. Update success/cancel URLs in server.js
3. Set up webhook endpoint for payment confirmations
4. Configure proper error handling and logging

## Webhook Integration (Optional)

The server includes a webhook endpoint at `/webhook` for handling Stripe events:
- Payment confirmations
- Failed payments  
- Refunds

Configure the webhook in your Stripe dashboard pointing to `/webhook`.