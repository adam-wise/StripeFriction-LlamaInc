// Stripe Configuration - Load from server
let stripe;

// Initialize Stripe with publishable key from server
fetch('/config')
    .then(response => response.json())
    .then(config => {
        stripe = Stripe(config.publishableKey);
    })
    .catch(error => {
        console.error('Failed to load Stripe configuration:', error);
    });

// A/B Testing Configuration
const PRICE_SETS = {
    A: {
        name: 'Control Pricing'
    },
    B: {
        name: 'Test Pricing'
    }
};

// A/B Testing Logic
function determineABTest() {
    // Check URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const forcedSet = urlParams.get('pricing');
    if (forcedSet && PRICE_SETS[forcedSet.toUpperCase()]) {
        return forcedSet.toUpperCase();
    }
    
    // Check localStorage for existing assignment
    let assignment = localStorage.getItem('pricing_test');
    if (assignment && PRICE_SETS[assignment]) {
        return assignment;
    }
    
    // Random assignment (50/50 split)
    assignment = Math.random() < 0.5 ? 'A' : 'B';
    localStorage.setItem('pricing_test', assignment);
    
    // Analytics tracking (optional)
    if (typeof gtag !== 'undefined') {
        gtag('event', 'pricing_test_assignment', {
            'custom_parameter': assignment
        });
    }
    
    return assignment;
}

// DOM Elements
const rentalDaysSelect = document.getElementById('rentalDays');
const rentalDateInput = document.getElementById('rentalDate');
const locationInput = document.getElementById('location');
const bookNowBtn = document.getElementById('bookNowBtn');
const bookingForm = document.getElementById('bookingForm');

// Event Listeners
rentalDaysSelect.addEventListener('change', validateForm);
rentalDateInput.addEventListener('change', validateForm);
locationInput.addEventListener('input', validateForm);

// Set minimum date to today
rentalDateInput.min = new Date().toISOString().split('T')[0];

function validateForm() {
    const isValid = rentalDaysSelect.value && 
                   rentalDateInput.value && 
                   locationInput.value.trim();
    
    if (isValid) {
        bookNowBtn.disabled = false;
        bookNowBtn.textContent = 'Book Now - See Pricing in Checkout';
    } else {
        bookNowBtn.disabled = true;
        bookNowBtn.textContent = 'Complete Form to Continue';
    }
}

// Form submission handler
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!rentalDaysSelect.value || !rentalDateInput.value || !locationInput.value.trim()) {
        return;
    }
    
    bookNowBtn.disabled = true;
    bookNowBtn.textContent = 'Redirecting to Checkout...';
    
    try {
        // Create checkout session
        const response = await fetch('/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nights: parseInt(rentalDaysSelect.value),
                startDate: rentalDateInput.value,
                location: locationInput.value.trim(),
                priceSetId: determineABTest()
            })
        });
        
        const session = await response.json();
        
        if (session.error) {
            throw new Error(session.error);
        }
        
        // Redirect to Stripe Checkout
        if (!stripe) {
            throw new Error('Stripe not initialized');
        }
        
        const result = await stripe.redirectToCheckout({
            sessionId: session.id
        });
        
        if (result.error) {
            throw new Error(result.error.message);
        }
        
    } catch (error) {
        console.error('Error:', error);
        alert('There was an error processing your request. Please try again or call us at (555) TRACTORS.');
        bookNowBtn.disabled = false;
        validateForm();
    }
});

// Initialize form
validateForm();

// Debug info (remove in production)
console.log('A/B Test Assignment:', determineABTest());
console.log('Active Price Set:', PRICE_SETS[determineABTest()].name);