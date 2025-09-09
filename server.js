require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('.'));

// A/B Testing Price Configuration
const STRIPE_PRICES = {
    A: {
        firstNight: 'price_control_first_night',      // Create in Stripe: $400
        additionalNight: 'price_control_additional_night', // Create in Stripe: $50
        platformFeeRate: 0.15,
        depositRate: 0.20
    },
    B: {
        firstNight: 'price_test_first_night',         // Create in Stripe: $350  
        additionalNight: 'price_test_additional_night',    // Create in Stripe: $60
        platformFeeRate: 0.18,
        depositRate: 0.15
    }
};

app.post('/create-checkout-session', async (req, res) => {
    try {
        const { nights, startDate, location, priceSetId, pricing } = req.body;
        
        // Validate input
        if (!nights || !startDate || !location || !priceSetId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const priceConfig = STRIPE_PRICES[priceSetId];
        if (!priceConfig) {
            return res.status(400).json({ error: 'Invalid price set' });
        }
        
        // Build line items for Stripe
        const lineItems = [];
        
        // First night rental
        lineItems.push({
            price: priceConfig.firstNight,
            quantity: 1,
        });
        
        // Additional nights (if any)
        if (nights > 1) {
            lineItems.push({
                price: priceConfig.additionalNight,
                quantity: nights - 1,
            });
        }
        
        // Calculate fees for one-time items
        const rentalSubtotal = (nights === 1) ? 400 : 400 + ((nights - 1) * 50);
        const platformFee = Math.round(rentalSubtotal * priceConfig.platformFeeRate);
        const preTotal = rentalSubtotal + platformFee;
        const deposit = Math.round(preTotal * priceConfig.depositRate);
        
        // Add platform fee as one-time item
        lineItems.push({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: `Platform Fee (${Math.round(priceConfig.platformFeeRate * 100)}%)`,
                    description: 'Service fee for tractor matching and support',
                },
                unit_amount: platformFee * 100, // Stripe uses cents
            },
            quantity: 1,
        });
        
        // Add security deposit as one-time item
        lineItems.push({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: `Security Deposit (${Math.round(priceConfig.depositRate * 100)}%)`,
                    description: 'Refundable if equipment returned undamaged',
                },
                unit_amount: deposit * 100, // Stripe uses cents
            },
            quantity: 1,
        });
        
        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/?cancelled=true`,
            metadata: {
                nights: nights.toString(),
                startDate,
                location,
                priceSetId,
                rentalSubtotal: rentalSubtotal.toString(),
                platformFee: platformFee.toString(),
                deposit: deposit.toString(),
                total: (preTotal + deposit).toString()
            },
            customer_creation: 'always',
            invoice_creation: {
                enabled: true,
                invoice_data: {
                    description: `Tractor rental for ${nights} night${nights > 1 ? 's' : ''} starting ${startDate}`,
                    metadata: {
                        location,
                        priceSetId
                    }
                }
            }
        });
        
        res.json({ id: session.id });
        
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Webhook endpoint for Stripe events (optional but recommended)
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.log(`Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log('Payment successful:', session.id);
            // Here you would:
            // 1. Save the booking to your database
            // 2. Send confirmation emails
            // 3. Trigger equipment matching process
            break;
        case 'payment_intent.succeeded':
            console.log('PaymentIntent was successful!');
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({received: true});
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Add endpoint to serve Stripe publishable key to frontend
app.get('/config', (req, res) => {
    res.json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Visit http://localhost:${port} to view your site`);
});