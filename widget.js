/* Fluxr Airtime Widget - Production Version */
(function () {
    // --- Fluxr Widget Configuration & Global State ---

    // Default configuration values
    const defaults = {
        publicKey: null,
        desktopPosition: 'bottom-right',
        mobileMode: 'modal',
        theme: 'fluxr',
        defaultCountryCode: '+263',
        supportedCountries: [
            { code: '+27', name: 'South Africa', flag: '🇿🇦', networks: ['Vodacom', 'MTN', 'Cell C', 'Telkom'] },
            { code: '+260', name: 'Zambia', flag: '🇿🇲', networks: ['MTN', 'Airtel', 'Zamtel'] },
            { code: '+258', name: 'Mozambique', flag: '🇲🇿', networks: ['Vodacom', 'Movitel', 'TMcel'] },
            { code: '+254', name: 'Kenya', flag: '🇰🇪', networks: ['Safaricom', 'Airtel', 'Telkom'] },
            { code: '+233', name: 'Ghana', flag: '🇬🇭', networks: ['MTN', 'Vodafone', 'AirtelTigo'] },
            { code: '+264', name: 'Namibia', flag: '🇳🇦', networks: ['MTC', 'TN Mobile'] },
            { code: '+243', name: 'DR Congo', flag: '🇨🇩', networks: ['Vodacom', 'Airtel', 'Orange', 'Africell'] },
            { code: '+263', name: 'Zimbabwe', flag: '🇿🇼', networks: ['Econet', 'NetOne', 'Telecel'] },
            { code: '+265', name: 'Malawi', flag: '🇲🇼', networks: ['TNM', 'Airtel'] },
            { code: '+267', name: 'Botswana', flag: '🇧🇼', networks: ['Mascom', 'Orange', 'BTC Mobile'] },
            { code: '+268', name: 'Eswatini', flag: '🇸🇿', networks: ['MTN', 'Swazi Mobile'] },
            { code: '+255', name: 'Tanzania', flag: '🇹🇿', networks: ['Vodacom', 'Airtel', 'Tigo', 'Halotel'] },
        ],
        onOpen: () => {},
        onClose: () => {},
        onSuccess: (payload) => { console.log('Fluxr: Success:', payload); },
        onError: (err) => { console.error('Fluxr: Error:', err); },
        onStepChange: (step) => { console.log('Fluxr: Step:', step); }
    };

    let config = { ...defaults };
    let instance = null;

    // The main state machine for the widget flow (Step 0 to 4)
    let widgetState = {
        step: 0,
        method: 'voucher',
        phoneE164: '+263',
        selectedCountry: defaults.supportedCountries.find(c => c.code === defaults.defaultCountryCode),
        network: null,
        voucherCode: '',
        amountUsd: null,
        availableValueUsd: 0,
        selection: null,
        reference: null,
        bundles: [],
        errors: {}
    };

    // --- Validation Functions ---
    const Validators = {
        phone: (phone) => {
            if (!phone) return 'Phone number is required';
            if (phone.length < 8) return 'Phone number is too short';
            
            // Check if phone starts with a supported country code
            const country = config.supportedCountries.find(c => phone.startsWith(c.code));
            if (!country) return 'Unsupported country code';
            
            // Basic phone number validation (country code + at least 7 digits)
            const phoneWithoutCountry = phone.replace(country.code, '');
            if (!/^\d{7,15}$/.test(phoneWithoutCountry)) {
                return 'Invalid phone number format';
            }
            
            return null;
        },

        voucher: (code) => {
            if (!code) return 'Voucher code is required';
            if (code.length < 8) return 'Voucher code is too short';
            if (!/^[A-Z0-9-]+$/i.test(code)) return 'Voucher code can only contain letters, numbers, and hyphens';
            if (code.toLowerCase().includes('invalid')) return 'Invalid voucher code';
            return null;
        },

        amount: (amount) => {
            if (!amount && amount !== 0) return 'Amount is required';
            if (isNaN(amount)) return 'Amount must be a number';
            if (amount < 1) return 'Minimum amount is $1.00';
            if (amount > 1000) return 'Maximum amount is $1000.00';
            if (!/^\d+(\.\d{1,2})?$/.test(amount.toString())) return 'Amount must have up to 2 decimal places';
            return null;
        },

        selection: (selection) => {
            if (!selection) return 'Please select an option';
            return null;
        }
    };

    // --- Mock API (For Demo/Local Development) ---
    const MockAPI = {
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
        async resolveNetwork(phone) {
            await this.delay(500);
            
            // Find the matching country
            const country = config.supportedCountries.find(c => phone.startsWith(c.code));
            if (!country) throw new Error("Unsupported country code");
            
            // Pick a random network for that country
            const network = country.networks[Math.floor(Math.random() * country.networks.length)];
            return { phone_e164: phone, network, country: country.name };
        },
        async getBundles(network, maxUsd) {
            await this.delay(600);
            const allBundles = {
                'Econet': [
                    { id: 'econet-data-1gb-week', name: 'Weekly Data Bundle - 1GB', type: 'data', price_usd: 5.00 },
                    { id: 'econet-voice-100m', name: 'Monthly Voice Bundle - 100 Mins', type: 'voice', price_usd: 4.50 },
                    { id: 'econet-data-500mb', name: 'Daily Data Bundle - 500MB', type: 'data', price_usd: 2.50 },
                ],
                'NetOne': [
                    { id: 'netone-data-2gb', name: 'Weekly Data Bundle - 2GB', type: 'data', price_usd: 5.00 },
                    { id: 'netone-voice-50m', name: 'Weekly Voice Bundle - 50 Mins', type: 'voice', price_usd: 3.00 },
                ],
                'Telecel': [
                    { id: 'telecel-data-1gb', name: 'Weekly Data Bundle - 1GB', type: 'data', price_usd: 4.50 },
                    { id: 'telecel-combo', name: 'Combo Bundle - 500MB + 50 Mins', type: 'combo', price_usd: 5.00 },
                ],
                'Vodacom': [
                    { id: 'vodacom-data-1gb', name: 'Weekly Data Bundle - 1GB', type: 'data', price_usd: 5.00 },
                    { id: 'vodacom-voice-100m', name: 'Monthly Voice Bundle - 100 Mins', type: 'voice', price_usd: 4.00 },
                ],
                'MTN': [
                    { id: 'mtn-data-1gb', name: 'Weekly Data Bundle - 1GB', type: 'data', price_usd: 5.00 },
                    { id: 'mtn-voice-50m', name: 'Weekly Voice Bundle - 50 Mins', type: 'voice', price_usd: 3.50 },
                ],
                'Safaricom': [
                    { id: 'safaricom-data-1gb', name: 'Weekly Data Bundle - 1GB', type: 'data', price_usd: 4.50 },
                    { id: 'safaricom-voice-100m', name: 'Monthly Voice Bundle - 100 Mins', type: 'voice', price_usd: 4.00 },
                ],
                'Airtel': [
                    { id: 'airtel-data-1gb', name: 'Weekly Data Bundle - 1GB', type: 'data', price_usd: 4.50 },
                    { id: 'airtel-voice-50m', name: 'Weekly Voice Bundle - 50 Mins', type: 'voice', price_usd: 3.00 },
                ]
            };
            return (allBundles[network] || []).filter(b => b.price_usd <= maxUsd).sort((a,b) => b.price_usd - a.price_usd);
        },
        async redeemVoucher(code, phone) {
            await this.delay(800);
            if (code.toLowerCase().includes('invalid')) {
                throw { code: 'VOUCHER_INVALID', message: 'Voucher not recognized' };
            }
            return { credit_id: 'cr_' + Math.random().toString(36).substr(2, 9), value_usd: 5.00, network: 'Econet' };
        },
        async startPaystack(amountUsd, phone, network) {
            await this.delay(600);
            return {
                paystack_key: 'pk_test_mock',
                email: 'no-reply@fluxr.co.za',
                amount_kobo: amountUsd * 100,
                ref: 'psk_' + Math.random().toString(36).substr(2, 9)
            };
        },
        async confirmPaystack(ref) {
            await this.delay(700);
            return { credit_id: 'cr_' + Math.random().toString(36).substr(2, 9), value_usd: 5.00 };
        },
        async sendAirtime(data) {
            await this.delay(900);
            return { status: 'sent', reference: 'FLX-2025-' + String(Math.floor(Math.random() * 999999)).padStart(6, '0') };
        }
    };

    // --- Utility and DOM functions ---
    
    function fireEvent(name, detail = {}) {
        const event = new CustomEvent(name, { detail, bubbles: true, composed: true });
        window.dispatchEvent(event);
        if (name === 'flx_open') config.onOpen();
        if (name === 'flx_close') config.onClose();
        if (name === 'flx_step') config.onStepChange(detail.step);
    }
    
    function logAndSurfaceError(err, context = 'API Call') {
        console.error(`Fluxr Widget Error in ${context}:`, err);
        alert(`Transaction Failed: ${err.message || 'An unknown error occurred.'}`);
        config.onError(err);
        fireEvent('flx_error', { code: err.code || 'UNKNOWN_ERROR' });
    }

    // --- The FluxrWidget Class ---

    class FluxrWidgetEngine {
        constructor() {
            this.root = null;
            this.modalEl = null;
            this.fabEl = null;
            this.isMobile = window.innerWidth <= 768;
            this.root = document.createElement('div');
            this.root.id = 'fluxr-widget-root';
            document.body.appendChild(this.root);
            this.applyStyles(); 
            this.render();
        }

        setState(updates) {
            const oldStep = widgetState.step;
            widgetState = { ...widgetState, ...updates };
            
            if (widgetState.step !== oldStep) {
                fireEvent('flx_step', { step: widgetState.step });
                this.render();
            } else {
                this.updateFormElements();
            }
        }

        validateCurrentStep(showErrors = false) {
            const { step, phoneE164, voucherCode, amountUsd, selection, method } = widgetState;
            const errors = {};

            if (step === 1) {
                const phoneError = Validators.phone(phoneE164);
                if (phoneError) errors.phone = phoneError;

                if (method === 'voucher') {
                    const voucherError = Validators.voucher(voucherCode);
                    if (voucherError) errors.voucher = voucherError;
                } else {
                    const amountError = Validators.amount(amountUsd);
                    if (amountError) errors.amount = amountError;
                }
            } else if (step === 2) {
                const selectionError = Validators.selection(selection);
                if (selectionError) errors.selection = selectionError;
            }

            if (showErrors) {
                widgetState.errors = errors;
            }
            
            return errors;
        }

        render() {
            const { step } = widgetState;

            if (step === 0) {
                this.renderFab();
            } else {
                this.renderModal();
            }
        }
        
        applyStyles() {
            const style = document.createElement('style');
            style.textContent = `
                #fluxr-widget-root * {
                    box-sizing: border-box;
                }

                #fluxr-widget-root {
                    position: fixed;
                    z-index: 999999;
                    font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
                }

                :root {
                    --flx-color-primary: #1a4d2e;
                    --flx-color-accent: #9ef01a;
                    --flx-color-surface: #ffffff;
                    --flx-color-muted: #6b7280;
                    --flx-color-danger: #ef4444;
                    --flx-radius: 16px;
                    --flx-shadow: 0 8px 24px rgba(0,0,0,.12);
                    --flx-font: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
                }

                .flx-fab {
                    position: fixed;
                    bottom: 24px;
                    ${config.desktopPosition === 'bottom-left' ? 'left: 24px;' : 'right: 24px;'}
                    background: var(--flx-color-primary); 
                    color: white; 
                    border: none; 
                    border-radius: 100px;
                    height: 60px;
                    padding: 0 24px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer; 
                    box-shadow: var(--flx-shadow);
                    transition: all 0.3s ease; 
                    font-family: var(--flx-font); 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    z-index: 999999;
                    white-space: nowrap;
                }

                .flx-fab:hover {
                    background: #0f3d23;
                    transform: translateY(-2px);
                    box-shadow: 0 12px 32px rgba(0,0,0,.18);
                }

                .flx-modal-overlay {
                    position: fixed; 
                    top: 0; 
                    left: 0; 
                    right: 0; 
                    bottom: 0; 
                    background: rgba(0, 0, 0, 0.5); 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    z-index: 1000000; 
                    animation: flxFadeIn 0.2s ease; 
                    padding: 20px;
                }

                @keyframes flxFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .flx-modal {
                    background: var(--flx-color-surface); 
                    border-radius: var(--flx-radius); 
                    width: 100%; 
                    max-width: 480px; 
                    max-height: 90vh; 
                    overflow: hidden; 
                    box-shadow: 0 20px 60px rgba(0,0,0,.3); 
                    animation: flxSlideUp 0.3s ease; 
                    display: flex; 
                    flex-direction: column;
                }

                @keyframes flxSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .flx-modal-header {
                    padding: 24px; 
                    border-bottom: 1px solid #e5e7eb; 
                    display: flex; 
                    align-items: center; 
                    gap: 12px; 
                    background: linear-gradient(135deg, var(--flx-color-primary) 0%, #0f3d23 100%); 
                    color: white;
                }

                .flx-back-btn {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 20px;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    transition: background 0.2s;
                }

                .flx-back-btn:hover {
                    background: rgba(255,255,255,0.1);
                }

                .flx-modal-title {
                    font-size: 20px;
                    font-weight: 700;
                    flex: 1;
                }

                .flx-close-btn {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 24px;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    transition: background 0.2s;
                }

                .flx-close-btn:hover {
                    background: rgba(255,255,255,0.1);
                }

                .flx-modal-body {
                    padding: 24px;
                    overflow-y: auto;
                    flex: 1;
                }

                .flx-modal-footer {
                    padding: 24px;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    gap: 12px;
                }

                .flx-form-group {
                    margin-bottom: 20px;
                    text-align: left;
                    box-sizing: border-box;
                }

                .flx-label {
                    display: block;
                    margin-bottom: 8px;
                    color: var(--flx-color-primary);
                    font-weight: 600;
                    font-size: 14px;
                    box-sizing: border-box;
                }

                .flx-input {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid #e5e7eb;
                    border-radius: 12px;
                    font-size: 16px;
                    font-family: var(--flx-font);
                    transition: all 0.2s;
                    background: white;
                    box-sizing: border-box !important;
                    max-width: 100%;
                }

                .flx-input:focus {
                    outline: none;
                    border-color: var(--flx-color-accent);
                    box-shadow: 0 0 0 3px rgba(158, 240, 26, 0.1);
                }

                .flx-input.error {
                    border-color: var(--flx-color-danger);
                }

                .flx-error-msg {
                    color: var(--flx-color-danger);
                    font-size: 13px;
                    margin-top: 6px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .flx-segmented {
                    display: flex;
                    gap: 8px;
                    background: #f3f4f6;
                    padding: 4px;
                    border-radius: 12px;
                }

                .flx-segment {
                    flex: 1;
                    padding: 12px 16px;
                    border: none;
                    background: transparent;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                    font-family: var(--flx-font);
                    transition: all 0.2s;
                    color: var(--flx-color-muted);
                }

                .flx-segment.active {
                    background: white;
                    color: var(--flx-color-primary);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                }

                .flx-btn {
                    padding: 14px 24px;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    font-family: var(--flx-font);
                    transition: all 0.2s;
                    flex: 1;
                }

                .flx-btn-primary {
                    background: var(--flx-color-primary);
                    color: white;
                }

                .flx-btn-primary:hover:not(:disabled) {
                    background: #0f3d23;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }

                .flx-btn-secondary {
                    background: #f3f4f6;
                    color: var(--flx-color-primary);
                }

                .flx-btn-secondary:hover {
                    background: #e5e7eb;
                }

                .flx-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .flx-summary {
                    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                    padding: 16px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                    color: var(--flx-color-primary);
                    font-weight: 600;
                    font-size: 14px;
                }

                .flx-option-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .flx-option {
                    padding: 16px;
                    border: 2px solid #e5e7eb;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: left;
                    background: white;
                }

                .flx-option:hover {
                    border-color: var(--flx-color-accent);
                    transform: translateX(4px);
                }

                .flx-option.selected {
                    border-color: var(--flx-color-accent);
                    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                }

                .flx-option-title {
                    font-weight: 600;
                    color: var(--flx-color-primary);
                    margin-bottom: 4px;
                }

                .flx-option-price {
                    color: var(--flx-color-muted);
                    font-size: 14px;
                }

                .flx-review-card {
                    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                }

                .flx-review-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 12px;
                    color: var(--flx-color-primary);
                }

                .flx-review-row:last-child {
                    margin-bottom: 0;
                    padding-top: 12px;
                    border-top: 2px solid rgba(26, 77, 46, 0.1);
                    font-weight: 700;
                    font-size: 18px;
                }

                .flx-review-label {
                    font-weight: 500;
                }

                .flx-review-value {
                    font-weight: 600;
                }

                .flx-success-icon {
                    width: 80px;
                    height: 80px;
                    background: var(--flx-color-accent);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 40px;
                    margin: 0 auto 20px;
                    animation: flxScaleIn 0.5s ease;
                }

                @keyframes flxScaleIn {
                    from {
                        transform: scale(0);
                        opacity: 0;
                    }
                    to {
                        transform: scale(1);
                        opacity: 1;
                    }
                }

                .flx-success-title {
                    font-size: 24px;
                    font-weight: 700;
                    color: var(--flx-color-primary);
                    margin-bottom: 12px;
                }

                .flx-success-msg {
                    color: var(--flx-color-muted);
                    margin-bottom: 20px;
                }

                .flx-reference {
                    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                    padding: 16px;
                    border-radius: 12px;
                    color: var(--flx-color-primary);
                    font-weight: 600;
                    font-family: monospace;
                    font-size: 16px;
                    margin-bottom: 20px;
                }

                .flx-loading {
                    text-align: center;
                    padding: 40px;
                    color: var(--flx-color-muted);
                }

                .flx-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #e5e7eb;
                    border-top-color: var(--flx-color-accent);
                    border-radius: 50%;
                    animation: flxSpin 0.8s linear infinite;
                    margin: 0 auto 16px;
                }

                @keyframes flxSpin {
                    to { transform: rotate(360deg); }
                }

                .flx-hidden {
                    display: none !important;
                }

                .flx-phone-input-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                    width: 100%;
                }

                .flx-country-selector {
                    position: absolute;
                    left: 12px;
                    z-index: 2;
                    background: white;
                    border: none;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    box-sizing: border-box;
                }

                .flx-phone-input {
                    padding-left: 100px !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                }

                .flx-country-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    border: 2px solid #e5e7eb;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,.12);
                    max-height: 200px;
                    overflow-y: auto;
                    z-index: 1000;
                    margin-top: 4px;
                }

                .flx-country-option {
                    padding: 12px 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border-bottom: 1px solid #f3f4f6;
                }

                .flx-country-option:hover {
                    background: #f9fafb;
                }

                .flx-country-option:last-child {
                    border-bottom: none;
                }

                .flx-country-code {
                    color: var(--flx-color-muted);
                    font-size: 14px;
                }

                @media (max-width: 768px) {
                    .flx-fab {
                        bottom: 16px;
                        ${config.desktopPosition === 'bottom-left' ? 'left: 16px;' : 'right: 16px;'}
                        width: auto;
                        border-radius: 100px;
                        height: 60px;
                        padding: 0 20px;
                    }

                    .flx-modal {
                        max-width: 100%;
                        max-height: 95vh;
                        margin: 0;
                    }

                    .flx-modal-overlay {
                        padding: 0;
                        align-items: flex-end;
                    }

                    .flx-country-dropdown {
                        position: fixed;
                        top: 50%;
                        left: 20px;
                        right: 20px;
                        transform: translateY(-50%);
                        max-height: 70vh;
                    }
                }
            `;
            this.root.appendChild(style);
        }

        renderFab() {
            if (this.modalEl) {
                this.modalEl.remove();
                this.modalEl = null;
            }
            if (!this.fabEl) {
                this.fabEl = document.createElement('button');
                this.fabEl.className = 'flx-fab';
                this.fabEl.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                    <span>Send Airtime Home</span>
                `;
                this.fabEl.onclick = () => this.open();
                this.root.appendChild(this.fabEl);
            }
        }

        renderModal() {
            if (this.fabEl) {
                this.fabEl.remove();
                this.fabEl = null;
            }
            if (!this.modalEl) {
                this.modalEl = document.createElement('div');
                this.modalEl.className = 'flx-modal-overlay';
                this.modalEl.onclick = (e) => this.handleOverlayClick(e);
                this.root.appendChild(this.modalEl);
            }

            const titles = ['', 'Send Airtime', 'Use Your Balance', 'Review & Confirm', 'Success'];
            const { step } = widgetState;
            
            this.modalEl.innerHTML = `
                <div class="flx-modal" onclick="event.stopPropagation()">
                    <div class="flx-modal-header">
                        ${step > 1 && step < 4 ? `<button class="flx-back-btn" onclick="window.FluxrWidget.goBack()">←</button>` : ''} 
                        <div class="flx-modal-title">${titles[step]}</div>
                        <button class="flx-close-btn" onclick="window.FluxrWidget.close()">×</button>
                    </div>
                    ${this.renderBodyContent(step)}
                    ${this.renderFooterContent(step)}
                </div>
            `;
        }
        
        updateFormElements() {
            const { step } = widgetState;
            
            if (step === 1) {
                this.updateStep1Elements();
            } else if (step === 2) {
                this.updateStep2Elements();
            }
        }
        
        updateStep1Elements() {
            const { method, phoneE164, voucherCode, amountUsd, errors, selectedCountry } = widgetState;
            
            // Update segmented control
            const segments = this.modalEl.querySelectorAll('.flx-segment');
            segments.forEach(segment => {
                const isActive = (segment.textContent.includes('Voucher') && method === 'voucher') ||
                               (segment.textContent.includes('Card') && method === 'card');
                segment.classList.toggle('active', isActive);
            });
            
            // Update phone input
            const phoneInput = this.modalEl.querySelector('.flx-phone-input');
            if (phoneInput && phoneInput !== document.activeElement) {
                phoneInput.value = phoneE164.replace(selectedCountry.code, '');
            }
            
            // Update country selector
            const countrySelector = this.modalEl.querySelector('.flx-country-selector');
            if (countrySelector) {
                countrySelector.innerHTML = `${selectedCountry.flag} ${selectedCountry.code}`;
            }
            
            // Update voucher/amount inputs
            const voucherGroup = this.modalEl.querySelector('.flx-voucher-group');
            const cardGroup = this.modalEl.querySelector('.flx-card-group');
            
            if (voucherGroup && cardGroup) {
                if (method === 'voucher') {
                    voucherGroup.classList.remove('flx-hidden');
                    cardGroup.classList.add('flx-hidden');
                    const voucherInput = voucherGroup.querySelector('input[type="text"]');
                    if (voucherInput && voucherInput !== document.activeElement) {
                        voucherInput.value = voucherCode;
                    }
                } else {
                    voucherGroup.classList.add('flx-hidden');
                    cardGroup.classList.remove('flx-hidden');
                    const amountInput = cardGroup.querySelector('input[type="number"]');
                    if (amountInput && amountInput !== document.activeElement) {
                        amountInput.value = amountUsd || '';
                    }
                }
            }
            
            // Update error messages
            this.updateErrorMessages();
            this.updateContinueButton();
        }
        
        updateStep2Elements() {
            const { selection, errors } = widgetState;
            
            const options = this.modalEl.querySelectorAll('.flx-option');
            options.forEach(option => {
                const isSelected = option.querySelector('.flx-option-title').textContent === selection?.label;
                option.classList.toggle('selected', isSelected);
            });
            
            // Update selection error
            const selectionError = this.modalEl.querySelector('.flx-selection-error');
            if (selectionError) {
                selectionError.textContent = errors.selection || '';
                selectionError.style.display = errors.selection ? 'block' : 'none';
            }
            
            const continueBtn = this.modalEl.querySelector('.flx-btn-primary');
            if (continueBtn) {
                continueBtn.disabled = !selection;
            }
        }
        
        updateErrorMessages() {
            const { errors } = widgetState;
            
            // Phone error
            const phoneError = this.modalEl.querySelector('.flx-phone-error');
            if (phoneError) {
                phoneError.textContent = errors.phone || '';
                phoneError.style.display = errors.phone ? 'flex' : 'none';
            }
            
            const phoneInput = this.modalEl.querySelector('.flx-phone-input');
            if (phoneInput) {
                phoneInput.classList.toggle('error', !!errors.phone);
            }
            
            // Voucher error
            const voucherError = this.modalEl.querySelector('.flx-voucher-error');
            if (voucherError) {
                voucherError.textContent = errors.voucher || '';
                voucherError.style.display = errors.voucher ? 'flex' : 'none';
            }
            
            const voucherInput = this.modalEl.querySelector('.flx-voucher-input');
            if (voucherInput) {
                voucherInput.classList.toggle('error', !!errors.voucher);
            }
            
            // Amount error
            const amountError = this.modalEl.querySelector('.flx-amount-error');
            if (amountError) {
                amountError.textContent = errors.amount || '';
                amountError.style.display = errors.amount ? 'flex' : 'none';
            }
            
            const amountInput = this.modalEl.querySelector('.flx-amount-input');
            if (amountInput) {
                amountInput.classList.toggle('error', !!errors.amount);
            }
        }
        
        updateContinueButton() {
            const continueBtn = this.modalEl.querySelector('.flx-btn-primary');
            
            if (continueBtn) {
                // Don't disable button, let validation happen on submit
                continueBtn.disabled = false;
            }
        }
        
        renderBodyContent(step) {
            switch(step) {
                case 1: return this.renderStep1();
                case 2: return this.renderStep2();
                case 3: return this.renderStep3();
                case 4: return this.renderStep4();
                default: return '<div class="flx-modal-body"></div>';
            }
        }

        renderStep1() {
            const { method, phoneE164, voucherCode, amountUsd, selectedCountry, errors } = widgetState;
            
            return `
                <div class="flx-modal-body">
                    <div class="flx-form-group">
                        <label class="flx-label">Payment Method</label>
                        <div class="flx-segmented">
                            <button class="flx-segment ${method === 'voucher' ? 'active' : ''}" onclick="window.FluxrWidget.setMethod('voucher')">
                                🇿🇦 Voucher (SA)
                            </button>
                            <button class="flx-segment ${method === 'card' ? 'active' : ''}" onclick="window.FluxrWidget.setMethod('card')">
                                💳 Card Payment
                            </button>
                        </div>
                    </div>

                    <div class="flx-form-group">
                        <label class="flx-label">Receiver's Phone</label>
                        <div class="flx-phone-input-container">
                            <button class="flx-country-selector" onclick="window.FluxrWidget.toggleCountryDropdown()">
                                ${selectedCountry.flag} ${selectedCountry.code}
                            </button>
                            <input 
                                type="tel" 
                                class="flx-input flx-phone-input ${errors.phone ? 'error' : ''}"
                                value="${phoneE164.replace(selectedCountry.code, '')}"
                                placeholder="771234567"
                                onblur="window.FluxrWidget.handlePhoneBlur(this.value)"
                                oninput="window.FluxrWidget.updatePhoneNumber(this.value)"
                            />
                        </div>
                        <div class="flx-error-msg flx-phone-error" style="display: ${errors.phone ? 'flex' : 'none'}">
                            ⚠️ ${errors.phone || ''}
                        </div>
                        <div style="font-size: 12px; color: var(--flx-color-muted); margin-top: 6px;">
                            Supported: ${config.supportedCountries.map(c => c.flag).join(' ')}
                        </div>
                    </div>

                    <div class="flx-form-group flx-voucher-group ${method !== 'voucher' ? 'flx-hidden' : ''}">
                        <label class="flx-label">Voucher Code</label>
                        <input 
                            type="text" 
                            class="flx-input flx-voucher-input ${errors.voucher ? 'error' : ''}"
                            value="${voucherCode}"
                            placeholder="1234-5678-9012"
                            oninput="window.FluxrWidget.updateVoucher(this.value)"
                        />
                        <div class="flx-error-msg flx-voucher-error" style="display: ${errors.voucher ? 'flex' : 'none'}">
                            ⚠️ ${errors.voucher || ''}
                        </div>
                    </div>
                    
                    <div class="flx-form-group flx-card-group ${method !== 'card' ? 'flx-hidden' : ''}">
                        <label class="flx-label">Amount (USD)</label>
                        <input 
                            type="number" 
                            class="flx-input flx-amount-input ${errors.amount ? 'error' : ''}"
                            value="${amountUsd || ''}"
                            placeholder="5.00"
                            min="1.00"
                            step="0.01"
                            oninput="window.FluxrWidget.updateAmount(this.value)"
                        />
                        <div class="flx-error-msg flx-amount-error" style="display: ${errors.amount ? 'flex' : 'none'}">
                            ⚠️ ${errors.amount || ''}
                        </div>
                    </div>
                </div>
            `;
        }

        renderStep2() {
            const { phoneE164, network, selection, bundles, availableValueUsd, errors } = widgetState;
            
            if (!network) { 
                return `<div class="flx-loading"><div class="flx-spinner"></div><div>Finding bundles...</div></div>`;
            }

            return `
                <div class="flx-modal-body">
                    <div class="flx-summary">
                        ${phoneE164} • ${network} 
                    </div>

                    <div class="flx-option-list">
                        <div class="flx-option ${selection?.type === 'full' ? 'selected' : ''}" onclick="window.FluxrWidget.selectFull()">
                            <div class="flx-option-title">Full airtime</div>
                            <div class="flx-option-price">${availableValueUsd.toFixed(2)} USD</div>
                        </div>

                        ${bundles.map(bundle => `
                            <div class="flx-option ${selection?.bundleId === bundle.id ? 'selected' : ''}" onclick="window.FluxrWidget.selectBundle('${bundle.id}', '${bundle.name}', ${bundle.price_usd})">
                                <div class="flx-option-title">${bundle.name}</div>
                                <div class="flx-option-price">${bundle.price_usd.toFixed(2)} USD</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="flx-error-msg flx-selection-error" style="display: ${errors.selection ? 'flex' : 'none'}; margin-top: 16px;">
                        ⚠️ ${errors.selection || ''}
                    </div>
                </div>
            `;
        }

        renderStep3() {
            const { phoneE164, network, selection } = widgetState;
            
            if (!selection) return '<div class="flx-modal-body">Error: No selection made.</div>';

            return `
                <div class="flx-modal-body">
                    <div class="flx-review-card">
                        <div class="flx-review-row">
                            <span class="flx-review-label">Receiver</span>
                            <span class="flx-review-value">${phoneE164}</span>
                        </div>
                        <div class="flx-review-row">
                            <span class="flx-review-label">Network</span>
                            <span class="flx-review-value">${network}</span>
                        </div>
                        <div class="flx-review-row">
                            <span class="flx-review-label">Selection</span>
                            <span class="flx-review-value">${selection.label}</span>
                        </div>
                        <div class="flx-review-row">
                            <span class="flx-review-label">Total</span>
                            <span class="flx-review-value">${selection.priceUsd.toFixed(2)} USD</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        renderStep4() {
            const { reference } = widgetState;
            
            return `
                <div class="flx-modal-body" style="text-align: center;">
                    <div class="flx-success-icon">✓</div>
                    <div class="flx-success-title">Success</div> 
                    <div class="flx-success-msg">Airtime sent</div> 
                    <div class="flx-reference">${reference}</div> 
                </div>
            `;
        }

        renderFooterContent(step) {
            const { errors } = widgetState;
            
            if (step === 1) {
                const hasErrors = Object.keys(errors).length > 0;
                
                return `
                    <div class="flx-modal-footer">
                        <button class="flx-btn flx-btn-primary" ${hasErrors ? 'disabled' : ''} onclick="window.FluxrWidget.continueStep1()">
                            Continue
                        </button>
                    </div>
                `;
            } else if (step === 2) {
                return `
                    <div class="flx-modal-footer">
                        <button class="flx-btn flx-btn-secondary" onclick="window.FluxrWidget.goBack()">Back</button>
                        <button class="flx-btn flx-btn-primary" ${!widgetState.selection ? 'disabled' : ''} onclick="window.FluxrWidget.continueStep2()">
                            Review & Confirm
                        </button>
                    </div>
                `;
            } else if (step === 3) {
                const label = widgetState.method === 'voucher' ? 'Apply Voucher' : 'Pay with Paystack';
                return `
                    <div class="flx-modal-footer">
                        <button class="flx-btn flx-btn-secondary" onclick="window.FluxrWidget.goBack()">Back</button>
                        <button class="flx-btn flx-btn-primary" onclick="window.FluxrWidget.processPayment()">
                            ${label}
                        </button>
                    </div>
                `;
            } else if (step === 4) {
                return `
                    <div class="flx-modal-footer">
                        <button class="flx-btn flx-btn-primary" onclick="window.FluxrWidget.close()">Close</button> 
                    </div>
                `;
            }
            return '';
        }

        open() {
            this.setState({ step: 1 });
            fireEvent('flx_open');
        }

        close() {
            this.setState({ 
                step: 0,
                method: 'voucher',
                phoneE164: config.defaultCountryCode,
                selectedCountry: config.supportedCountries.find(c => c.code === config.defaultCountryCode),
                network: null,
                voucherCode: '',
                amountUsd: null,
                selection: null,
                reference: null,
                bundles: [],
                errors: {}
            });
            fireEvent('flx_close');
        }

        goBack() {
            this.setState({ step: widgetState.step - 1 });
        }
        
        setMethod(method) {
            this.setState({ method, amountUsd: null, voucherCode: '', errors: {} });
        }

        updatePhoneNumber(phoneNumber) {
            const fullPhone = widgetState.selectedCountry.code + phoneNumber.replace(/\D/g, '');
            this.setState({ phoneE164: fullPhone });
        }

        updateVoucher(value) {
            this.setState({ voucherCode: value.toUpperCase() });
        }

        updateAmount(value) {
            this.setState({ amountUsd: parseFloat(value) || null });
        }

        selectCountry(country) {
            const currentPhone = widgetState.phoneE164.replace(widgetState.selectedCountry.code, '');
            const newPhone = country.code + currentPhone;
            this.setState({ 
                selectedCountry: country,
                phoneE164: newPhone,
                network: null
            });
            this.hideCountryDropdown();
        }

        toggleCountryDropdown() {
            const existingDropdown = this.modalEl.querySelector('.flx-country-dropdown');
            if (existingDropdown) {
                existingDropdown.remove();
                return;
            }

            const dropdown = document.createElement('div');
            dropdown.className = 'flx-country-dropdown';
            
            dropdown.innerHTML = config.supportedCountries.map(country => `
                <div class="flx-country-option" onclick="window.FluxrWidget.selectCountry(${JSON.stringify(country).replace(/"/g, '&quot;')})">
                    <span>${country.flag}</span>
                    <span style="flex: 1">${country.name}</span>
                    <span class="flx-country-code">${country.code}</span>
                </div>
            `).join('');

            const phoneContainer = this.modalEl.querySelector('.flx-phone-input-container');
            phoneContainer.appendChild(dropdown);

            setTimeout(() => {
                const clickHandler = (e) => {
                    if (!dropdown.contains(e.target) && !phoneContainer.contains(e.target)) {
                        this.hideCountryDropdown();
                        document.removeEventListener('click', clickHandler);
                    }
                };
                document.addEventListener('click', clickHandler);
            }, 0);
        }

        hideCountryDropdown() {
            const dropdown = this.modalEl.querySelector('.flx-country-dropdown');
            if (dropdown) {
                dropdown.remove();
            }
        }

        async handlePhoneBlur(phoneNumber) {
            if (phoneNumber && phoneNumber.length > 3) {
                try {
                    const result = await MockAPI.resolveNetwork(widgetState.phoneE164);
                    this.setState({ network: result.network });
                } catch (err) {
                    this.setState({ network: null });
                }
            }
        }

        async continueStep1() {
            // Validate and show errors on submit
            const errors = this.validateCurrentStep(true);
            
            if (Object.keys(errors).length > 0) {
                this.updateFormElements();
                return;
            }
            
            const { method, amountUsd, phoneE164 } = widgetState;
            
            if (!widgetState.network) {
                try {
                    const result = await MockAPI.resolveNetwork(phoneE164);
                    this.setState({ network: result.network });
                } catch (err) {
                    this.setState({ 
                        errors: { ...widgetState.errors, phone: 'Could not resolve network for this number' }
                    });
                    return;
                }
            }
            
            const availableValueUsd = method === 'card' ? amountUsd : 5.00;
            
            this.setState({ availableValueUsd, selection: null });
            this.setState({ step: 2 });
            
            try {
                const bundles = await MockAPI.getBundles(widgetState.network, availableValueUsd);
                this.setState({ bundles });
            } catch (err) {
                logAndSurfaceError({ code: 'BUNDLES_FETCH_FAILED', message: 'Failed to load bundles.'}, 'Fetch Bundles');
            }
        }

        selectFull() {
            this.setState({
                selection: {
                    type: 'full',
                    priceUsd: widgetState.availableValueUsd,
                    label: `Full airtime (${widgetState.availableValueUsd.toFixed(2)})`
                }
            });
        }

        selectBundle(id, name, price) {
            this.setState({
                selection: {
                    type: 'bundle',
                    bundleId: id,
                    priceUsd: price,
                    label: name
                }
            });
        }

        continueStep2() {
            // Validate and show errors on submit
            const errors = this.validateCurrentStep(true);
            
            if (Object.keys(errors).length > 0) {
                this.updateFormElements();
                return;
            }
            this.setState({ step: 3 });
        }

        async processPayment() {
            const { method, phoneE164, network, selection, voucherCode, amountUsd } = widgetState;
            
            const body = this.modalEl.querySelector('.flx-modal-body');
            body.innerHTML = `<div class="flx-loading"><div class="flx-spinner"></div><div>Processing payment...</div></div>`;
            this.modalEl.querySelector('.flx-modal-footer').remove();
            
            try {
                let creditId;
                let finalAmountUsd = selection.priceUsd;

                if (method === 'voucher') {
                    const voucherResult = await MockAPI.redeemVoucher(voucherCode, phoneE164);
                    creditId = voucherResult.credit_id;
                    finalAmountUsd = voucherResult.value_usd;
                } else {
                    fireEvent('flx_payment_start', { method: 'card' });
                    const paystackData = await MockAPI.startPaystack(amountUsd, phoneE164, network);
                    
                    await MockAPI.delay(2000);
                    const confirmResult = await MockAPI.confirmPaystack(paystackData.ref);
                    creditId = confirmResult.credit_id;
                    fireEvent('flx_payment_success', { method: 'card', amountUsd });
                }

                const sendResult = await MockAPI.sendAirtime({
                    credit_source: { type: method, id: creditId },
                    receiver: { phone: phoneE164, network },
                    selection: { type: selection.type, bundleId: selection.bundleId, amount_usd: selection.priceUsd }
                });

                this.setState({ 
                    reference: sendResult.reference,
                    step: 4 
                });
                
                config.onSuccess({ 
                    reference: sendResult.reference, 
                    amountUsd: selection.priceUsd,
                    method 
                });
                fireEvent('flx_send_success', { reference: sendResult.reference, amountUsd: selection.priceUsd, method });

            } catch (err) {
                logAndSurfaceError(err, 'Payment/Send');
                this.setState({ step: 3 });
            }
        }
        
        handleOverlayClick(e) {
            if (e.target === this.modalEl) {
                this.close();
            }
        }
    }
    
    function parseScriptAttributes() {
        const scriptTag = document.querySelector('script[src$="widget.js"]');
        if (!scriptTag) return {};
        
        return {
            publicKey: scriptTag.getAttribute('data-fluxr-public-key'),
            desktopPosition: scriptTag.getAttribute('data-position-desktop'),
            mobileMode: scriptTag.getAttribute('data-mode-mobile'),
            theme: scriptTag.getAttribute('data-theme'),
        };
    }

    const PublicApi = {
        init(options = {}) {
            const scriptAttrs = parseScriptAttributes();
            config = { 
                ...defaults, 
                ...scriptAttrs,
                ...options 
            };
            
            if (!config.publicKey) {
                console.error("Fluxr Widget: 'publicKey' is required. Please set data-fluxr-public-key or publicKey in init().");
                return;
            }
            
            if (!instance) {
                instance = new FluxrWidgetEngine();
            }
        },
        open() {
            if (instance) instance.open();
        },
        close() {
            if (instance) instance.close();
        },
        goBack() {
            if (instance) instance.goBack();
        },
        setMethod: (m) => instance.setMethod(m),
        updatePhoneNumber: (v) => instance.updatePhoneNumber(v),
        updateVoucher: (v) => instance.updateVoucher(v),
        updateAmount: (v) => instance.updateAmount(v),
        handlePhoneBlur: (v) => instance.handlePhoneBlur(v),
        toggleCountryDropdown: () => instance.toggleCountryDropdown(),
        selectCountry: (country) => instance.selectCountry(country),
        continueStep1: () => instance.continueStep1(),
        selectFull: () => instance.selectFull(),
        selectBundle: (id, name, price) => instance.selectBundle(id, name, price),
        continueStep2: () => instance.continueStep2(),
        processPayment: () => instance.processPayment(),
        getState: () => widgetState
    };
    
    window.FluxrWidget = PublicApi;

    document.addEventListener('DOMContentLoaded', () => {
        const scriptTag = document.querySelector('script[src$="widget.js"]');
        if (scriptTag && scriptTag.hasAttribute('data-fluxr-public-key')) {
            PublicApi.init();
        }
    });
    
})();