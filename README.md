# Fluxr Airtime Widget

A beautiful, embeddable widget that allows users to send airtime to Zimbabwe from any website.

## Features

- 🎯 **Easy Integration** - Add with just a few lines of code
- 📱 **Responsive Design** - Works perfectly on desktop and mobile
- 💳 **Multiple Payment Methods** - Voucher codes and card payments
- 🎨 **Customizable** - Theme, positioning, and behavior options
- 🔧 **Developer Friendly** - Comprehensive events and callbacks


## Quick Start

### 1. Include the Widget Script

Add the following script tag to your HTML:

```html
<script src="https://cdn.fluxr.co/widget.js" 
        data-fluxr-public-key="your-public-key-here"
        data-position-desktop="bottom-right"
        data-mode-mobile="modal"
        data-theme="fluxr">
</script>
```

### 2. Initialize the Widget

```javascript
// Initialize with your configuration
FluxrWidget.init({
    publicKey: 'your-public-key-here',
    desktopPosition: 'bottom-right', // or 'bottom-left'
    mobileMode: 'modal', // or 'sheet'
    theme: 'fluxr',
    defaultCountryCode: '+263',
    
    // Event callbacks
    onOpen: () => console.log('Widget opened'),
    onClose: () => console.log('Widget closed'),
    onSuccess: (payload) => console.log('Transaction successful:', payload),
    onError: (err) => console.error('Error occurred:', err),
    onStepChange: (step) => console.log('Step changed:', step)
});
```

### 3. Manual Control (Optional)

```javascript
// Open the widget programmatically
FluxrWidget.open();

// Close the widget programmatically  
FluxrWidget.close();

// Get current state
const state = FluxrWidget.getState();
```

## Configuration Options

### Required Parameters

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `publicKey` | string | Your Fluxr public API key | ✅ |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `desktopPosition` | string | `'bottom-right'` | Widget position on desktop: `'bottom-right'` or `'bottom-left'` |
| `mobileMode` | string | `'modal'` | Mobile display mode: `'modal'` or `'sheet'` |
| `theme` | string | `'fluxr'` | Color theme (currently only `'fluxr'` supported) |
| `defaultCountryCode` | string | `'+263'` | Default country code for phone numbers |

### Event Callbacks

| Callback | Parameters | Description |
|----------|------------|-------------|
| `onOpen` | - | Called when widget opens |
| `onClose` | - | Called when widget closes |
| `onSuccess` | `payload` | Called on successful transaction |
| `onError` | `error` | Called when an error occurs |
| `onStepChange` | `step` | Called when user moves between steps |

## Payment Flow

The widget guides users through a simple 4-step process:

### Step 1: Enter Details
- Choose payment method (Voucher or Card)
- Enter recipient's phone number
- Enter voucher code (if voucher method) or amount (if card method)

### Step 2: Select Airtime Option
- Choose between full airtime or specific bundles
- View available options based on network and amount

### Step 3: Review & Confirm
- Review all transaction details
- Confirm and process payment

### Step 4: Success
- Display transaction reference
- Show success message

## API Reference

### Methods

#### `FluxrWidget.init(options)`
Initializes the widget with configuration options.

```javascript
FluxrWidget.init({
    publicKey: 'pk_your_key_here',
    desktopPosition: 'bottom-right',
    onSuccess: (payload) => {
        console.log('Transaction completed:', payload.reference);
    }
});
```

#### `FluxrWidget.open()`
Programmatically opens the widget.

#### `FluxrWidget.close()`
Programmatically closes the widget.

#### `FluxrWidget.getState()`
Returns the current widget state for debugging.

### Events

The widget emits custom events that you can listen for:

```javascript
window.addEventListener('flx_open', (e) => {
    console.log('Widget opened', e.detail);
});

window.addEventListener('flx_close', (e) => {
    console.log('Widget closed', e.detail);
});

window.addEventListener('flx_step', (e) => {
    console.log('Step changed to:', e.detail.step);
});

window.addEventListener('flx_send_success', (e) => {
    console.log('Airtime sent successfully:', e.detail);
});

window.addEventListener('flx_error', (e) => {
    console.error('Error occurred:', e.detail);
});
```

## Success Payload

When a transaction is successful, the `onSuccess` callback receives:

```javascript
{
    reference: 'FLX-2025-123456',  // Unique transaction reference
    amountUsd: 5.00,               // Amount sent in USD
    method: 'voucher'              // Payment method used
}
```

## Error Handling

The widget handles various error scenarios:

- Invalid phone numbers
- Network resolution failures
- Voucher validation errors
- Payment processing failures
- API connectivity issues

Errors are passed to the `onError` callback and can also be listened for via the `flx_error` event.

## Styling and Customization

### CSS Custom Properties

The widget uses CSS custom properties for theming:

```css
:root {
    --flx-color-primary: #1a4d2e;
    --flx-color-accent: #9ef01a;
    --flx-color-surface: #ffffff;
    --flx-color-muted: #6b7280;
    --flx-color-danger: #ef4444;
    --flx-radius: 16px;
    --flx-shadow: 0 8px 24px rgba(0,0,0,.12);
    --flx-font: 'Inter', system-ui, sans-serif;
}
```

### Responsive Behavior

- **Desktop**: Circular button in corner (right or left)
- **Mobile**: Full-width button at bottom
- **Modal/Sheet**: Adaptive overlay based on screen size

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Security

- All API calls are made over HTTPS
- No sensitive data is stored in the widget
- Payment processing handled by secure providers
- Network isolation using Shadow DOM (production)

## Troubleshooting

### Common Issues

1. **Widget not appearing**
   - Check if public key is correctly set
   - Verify script is loaded before calling `init()`
   - Check browser console for errors

2. **Network resolution failing**
   - Ensure phone number starts with +263
   - Verify network connectivity
   - Check API key permissions

3. **Payment processing errors**
   - Validate voucher codes
   - Ensure sufficient funds for card payments
   - Check transaction limits

### Debug Mode

Enable debug logging by setting:

```javascript
FluxrWidget.init({
    publicKey: 'your-key',
    onError: (err) => console.error('Fluxr Error:', err),
    onStepChange: (step) => console.log('Step:', step)
});
```

## Examples

### Basic Integration

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
</head>
<body>
    <h1>Welcome to My Site</h1>
    
    <!-- Include Fluxr Widget -->
    <script src="https://cdn.fluxr.co/widget.js" 
            data-fluxr-public-key="pk_your_key_here">
    </script>
    
    <script>
        // Widget will auto-initialize with data attributes
    </script>
</body>
</html>
```

### Advanced Integration with Custom Events

```html
<script src="https://cdn.fluxr.co/widget.js"></script>
<script>
    FluxrWidget.init({
        publicKey: 'pk_your_key_here',
        desktopPosition: 'bottom-left',
        
        onOpen: () => {
            // Track widget opens in analytics
            analytics.track('fluxr_widget_opened');
        },
        
        onSuccess: (payload) => {
            // Handle successful transactions
            console.log('Airtime sent:', payload.reference);
            showSuccessMessage(`Airtime sent! Reference: ${payload.reference}`);
        },
        
        onError: (err) => {
            // Handle errors gracefully
            showErrorMessage('Failed to send airtime. Please try again.');
        }
    });

    // Listen for custom events
    window.addEventListener('flx_send_success', (e) => {
        // Update UI or trigger other actions
        updateTransactionHistory(e.detail);
    });
</script>
```

## Support

For technical support, API issues, or feature requests:

- 📧 Email: support@fluxr.co
- 🌐 Website: https://fluxr.co
- 📚 Documentation: https://docs.fluxr.co

## License

This widget is proprietary software. Unauthorized distribution or modification is prohibited.

---

**Fluxr Airtime Widget** - Making cross-border airtime transfers simple and seamless.