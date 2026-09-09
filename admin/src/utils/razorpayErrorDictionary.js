/**
 * Official Razorpay Error Code Reference & Diagnostic Resolver
 * Maps error codes and raw failure messages to Razorpay Source, Description, and Resolution Next Steps.
 */

export const RAZORPAY_SOURCE_MAP = {
  customer: {
    label: 'Customer Action Required',
    badge: 'Customer',
    badgeBg: '#eff6ff',
    badgeColor: '#1d4ed8',
    borderColor: '#bfdbfe',
    actor: 'Customer',
    meaning: 'The customer made an error (wrong OTP, cancelled payment, insufficient funds, card expired).'
  },
  business: {
    label: 'Business / Integration Action Required',
    badge: 'Business',
    badgeBg: '#fffbeb',
    badgeColor: '#b45309',
    borderColor: '#fde68a',
    actor: 'Merchant / Admin',
    meaning: 'Your integration sent an invalid request (missing field, wrong amount, method not enabled).'
  },
  gateway: {
    label: 'Bank / Gateway Technical Downtime',
    badge: 'Bank Gateway',
    badgeBg: '#fef2f2',
    badgeColor: '#b91c1c',
    borderColor: '#fecaca',
    actor: 'Issuing Bank / Gateway',
    meaning: 'The payment gateway or bank returned a transient error. Suggest trying another bank or method.'
  },
  issuer_bank: {
    label: 'Issuing Bank Issue',
    badge: 'Issuer Bank',
    badgeBg: '#fef2f2',
    badgeColor: '#b91c1c',
    borderColor: '#fecaca',
    actor: 'Customer Bank',
    meaning: 'The customer bank CBS encountered technical errors or cutoff in progress.'
  },
  customer_psp: {
    label: 'UPI PSP App Issue',
    badge: 'UPI PSP',
    badgeBg: '#f0fdf4',
    badgeColor: '#15803d',
    borderColor: '#bbf7d0',
    actor: 'GPay / PhonePe / Paytm App',
    meaning: 'Technical error occurred at the customer\'s PSP app.'
  },
  razorpay: {
    label: 'Razorpay System Error',
    badge: 'Razorpay Server',
    badgeBg: '#f3e8ff',
    badgeColor: '#6b21a8',
    borderColor: '#e9d5ff',
    actor: 'Razorpay Infrastructure',
    meaning: 'An internal error at Razorpay\'s end. Retry after a short delay.'
  }
};

export const RAZORPAY_ERROR_CATALOG = {
  amount_less_than_minimum_amount: {
    source: 'business',
    description: 'Amount in the payment request is less than the minimum amount. Transacting through some banks have fixed fees.',
    nextSteps: 'Please make sure that the payment amount is more than the minimum fees associated with the bank.'
  },
  authentication_failed: {
    source: 'customer',
    description: 'The payment failed as 3D secure, or OTP authentication failed. The user cancelled payment on OTP screen or entered incorrect details.',
    nextSteps: 'The customer must enter correct authentication details or OTP to complete the payment.'
  },
  bank_account_invalid: {
    source: 'customer',
    description: 'The bank account is not valid. The customer or bank could have closed the account.',
    nextSteps: 'The customer must try using a valid bank account or another payment method.'
  },
  bank_account_validation_failed: {
    source: 'customer',
    description: 'The third party validation failed as the given bank account details were incorrect or could not be verified.',
    nextSteps: 'The customer should check the bank account details provided and try again.'
  },
  bank_not_enabled: {
    source: 'business',
    description: 'The selected bank to complete the transaction is not enabled for your business.',
    nextSteps: 'Please reach out to Razorpay to enable the selected bank.'
  },
  bank_technical_error: {
    source: 'gateway',
    description: 'The issuing bank was facing technical problems at the moment the payment was attempted (Core Banking System error).',
    nextSteps: 'The customer must try using another bank account or another payment method.'
  },
  bank_cutoff_in_progress: {
    source: 'gateway',
    description: 'Bank CBS cutoff is in progress. This is a periodic scheduled event at the bank\'s end.',
    nextSteps: 'The customer must wait a few minutes and retry.'
  },
  bank_not_available: {
    source: 'gateway',
    description: 'Bank is not available due to a downtime or a technical issue.',
    nextSteps: 'The customer must retry with a different bank or payment method.'
  },
  capture_failed: {
    source: 'razorpay',
    description: 'Payment capture has failed.',
    nextSteps: 'Please reach out to Razorpay support.'
  },
  card_expired: {
    source: 'customer',
    description: 'The card has expired.',
    nextSteps: 'The customer must retry with a valid non-expired card.'
  },
  card_declined: {
    source: 'gateway',
    description: 'The payment was declined by the customer\'s bank, resulting in the transaction being unsuccessful.',
    nextSteps: 'Advise your customer to reach out to their bank or attempt payment again using another card.'
  },
  card_disabled_for_online_payments: {
    source: 'customer',
    description: 'The payment was unsuccessful as the card was not activated or enabled by the customer for online transactions.',
    nextSteps: 'Guide your customer to enable online transaction functionality for their card through their Banking App.'
  },
  card_network_not_enabled: {
    source: 'business',
    description: 'The card\'s network (Visa, Mastercard, etc.) is not enabled for the merchant.',
    nextSteps: 'Please reach out to Razorpay to enable the card network.'
  },
  card_not_enrolled: {
    source: 'customer',
    description: 'The card is not enrolled for this payment method.',
    nextSteps: 'Customer needs to enroll the card for this payment method or use another card.'
  },
  card_number_invalid: {
    source: 'customer',
    description: 'The card number is invalid.',
    nextSteps: 'Customer needs to enter a valid card number.'
  },
  card_type_invalid: {
    source: 'customer',
    description: 'The card type is invalid.',
    nextSteps: 'Customer needs to use a valid card type.'
  },
  compliance_violation: {
    source: 'business',
    description: 'The payment violates compliance requirements.',
    nextSteps: 'Please ensure the payment meets all compliance requirements.'
  },
  debit_instrument_blocked: {
    source: 'customer',
    description: 'The customer is using a blocked card to complete the payment. The card could have been blocked by the issuer or by customer.',
    nextSteps: 'The customer must retry with a different card or contact bank to unblock card.'
  },
  debit_instrument_inactive: {
    source: 'customer',
    description: 'The payment was unsuccessful as the card was not activated or enabled for online transactions.',
    nextSteps: 'Advise customer to enable online payments in their banking app or use an active card.'
  },
  duplicate_refund_id: {
    source: 'business',
    description: 'A refund with this ID already exists.',
    nextSteps: 'Please use a unique refund ID.'
  },
  duplicate_request: {
    source: 'business',
    description: 'A duplicate request has been submitted.',
    nextSteps: 'Please avoid duplicate requests.'
  },
  emi_greater_than_max_amount: {
    source: 'customer',
    description: 'The EMI amount is greater than the maximum allowed amount.',
    nextSteps: 'Please reduce the EMI amount or use another payment method.'
  },
  emi_plan_unavailable: {
    source: 'customer',
    description: 'The EMI plan is not available.',
    nextSteps: 'Please choose another EMI plan or payment method.'
  },
  gateway_technical_error: {
    source: 'gateway',
    description: 'Technical error occurred at the gateway or partner bank downtime.',
    nextSteps: 'Please retry after some time or use another payment method.'
  },
  incorrect_atm_pin: {
    source: 'customer',
    description: 'Incorrect ATM PIN entered.',
    nextSteps: 'Customer needs to enter the correct ATM PIN.'
  },
  incorrect_card_details: {
    source: 'customer',
    description: 'Incorrect card details entered.',
    nextSteps: 'Customer needs to enter correct card details.'
  },
  incorrect_card_expiry_date: {
    source: 'customer',
    description: 'Incorrect card expiry date entered.',
    nextSteps: 'Customer needs to enter the correct card expiry date.'
  },
  incorrect_cardholder_name: {
    source: 'customer',
    description: 'Incorrect cardholder name entered.',
    nextSteps: 'Customer needs to enter the correct cardholder name.'
  },
  incorrect_cvv: {
    source: 'customer',
    description: 'The customer has entered an incorrect CVV to complete the payment.',
    nextSteps: 'The customer must retry and enter the correct CVV.'
  },
  incorrect_otp: {
    source: 'customer',
    description: 'The customer has entered an incorrect OTP to complete the payment.',
    nextSteps: 'The customer must retry and enter the correct OTP.'
  },
  incorrect_pin: {
    source: 'customer',
    description: 'Incorrect PIN entered.',
    nextSteps: 'Customer needs to enter the correct PIN.'
  },
  input_validation_failed: {
    source: 'business',
    description: 'Payment failed due to wrong request or input sent in the payment request.',
    nextSteps: 'Rectify the validation issues and check parameter values.'
  },
  insufficient_funds: {
    source: 'customer',
    description: 'The customer does not have sufficient funds in the account to complete the payment.',
    nextSteps: 'The customer must retry with a different card, account, or method.'
  },
  international_transaction_not_allowed: {
    source: 'customer',
    description: 'International transactions are not allowed on this card.',
    nextSteps: 'Customer needs to use a domestic payment method or enable international transactions.'
  },
  invalid_amount: {
    source: 'business',
    description: 'The amount provided is invalid.',
    nextSteps: 'Please provide a valid amount.'
  },
  invalid_currency: {
    source: 'business',
    description: 'The currency passed is not supported or is invalid.',
    nextSteps: 'Check the list of supported currencies and use the correct currency code.'
  },
  invalid_device: {
    source: 'customer',
    description: 'The device used is invalid for this transaction.',
    nextSteps: 'Customer needs to use a valid device.'
  },
  invalid_email: {
    source: 'business',
    description: 'The email address provided is invalid.',
    nextSteps: 'Please provide a valid email address.'
  },
  invalid_mobile_number: {
    source: 'customer',
    description: 'The mobile number provided is not valid.',
    nextSteps: 'Customer needs to provide a valid 10-digit mobile number and retry.'
  },
  invalid_order_id: {
    source: 'business',
    description: 'Order ID required in the payment request is either missing or is invalid.',
    nextSteps: 'Make sure the correct order ID is always passed while initiating a new payment.'
  },
  invalid_request: {
    source: 'business',
    description: 'The request is invalid.',
    nextSteps: 'Please check the request format and retry.'
  },
  invalid_user_details: {
    source: 'customer',
    description: 'Invalid user details provided.',
    nextSteps: 'Customer needs to provide valid user details.'
  },
  invalid_vpa: {
    source: 'customer',
    description: 'The customer has entered an incorrect or unregistered VPA (UPI ID) to complete the payment.',
    nextSteps: 'The customer must check and enter the correct VPA or link bank account on UPI app.'
  },
  vpa_resolution_failed: {
    source: 'customer',
    description: 'The UPI network failed to validate the VPA. Technical error during resolution.',
    nextSteps: 'The customer must retry using a different bank account or method.'
  },
  live_mode_not_enabled: {
    source: 'business',
    description: 'Live mode is not enabled for your business. Test mode keys were used.',
    nextSteps: 'Generate live mode keys in Razorpay Dashboard and update API credentials.'
  },
  merchant_not_activated: {
    source: 'business',
    description: 'The merchant account is not activated.',
    nextSteps: 'Please contact Razorpay to activate the merchant account.'
  },
  mismatch_in_transaction_details: {
    source: 'business',
    description: 'There is a mismatch in transaction details.',
    nextSteps: 'Please check and correct the transaction details.'
  },
  mobile_number_invalid: {
    source: 'customer',
    description: 'The mobile number is invalid.',
    nextSteps: 'Customer needs to provide a valid mobile number.'
  },
  order_already_paid: {
    source: 'business',
    description: 'There can only be one successful payment for each order ID. A payment is already completed.',
    nextSteps: 'Check order status before initiating a new payment attempt.'
  },
  order_amount_mismatch: {
    source: 'business',
    description: 'Amount in order request is different from amount in payment request.',
    nextSteps: 'Please make sure that the same amount is passed in both payment and order request.'
  },
  otp_attempts_exceeded: {
    source: 'customer',
    description: 'OTP attempts have been exceeded.',
    nextSteps: 'Customer needs to wait and retry after some time.'
  },
  otp_expired: {
    source: 'customer',
    description: 'The OTP has expired.',
    nextSteps: 'Customer needs to request a new OTP.'
  },
  payment_cancelled: {
    source: 'customer',
    description: 'The customer explicitly cancelled the payment or closed the checkout authentication window.',
    nextSteps: 'Customer opened checkout but did not complete authentication. Suggest customer to retry.'
  },
  payment_failed: {
    source: 'gateway',
    description: 'Payment processing failed due to error at bank or wallet gateway.',
    nextSteps: 'Please retry with a different payment method.'
  },
  payment_method_not_enabled: {
    source: 'business',
    description: 'The selected payment method is not enabled for your business.',
    nextSteps: 'Reach out to Razorpay to enable the payment method on dashboard.'
  },
  payment_risk_check_failed: {
    source: 'customer',
    description: 'Payment declined due to risk checks performed by Razorpay, Gateway, or Issuer Bank.',
    nextSteps: 'The customer must retry with a different card or method.'
  },
  payment_timed_out: {
    source: 'customer',
    description: 'The customer did not complete transaction within the specified time (typically 10 minutes).',
    nextSteps: 'The customer must retry and complete transaction within the time limit.'
  },
  pin_attempts_exceeded: {
    source: 'customer',
    description: 'PIN attempts have been exceeded.',
    nextSteps: 'Customer needs to wait and retry after some time.'
  },
  pin_not_set: {
    source: 'customer',
    description: 'PIN is not set for the payment method.',
    nextSteps: 'Customer needs to set a PIN for the payment method.'
  },
  refund_limit_crossed: {
    source: 'business',
    description: 'The refund limit has been crossed.',
    nextSteps: 'Please contact Razorpay for assistance.'
  },
  server_error: {
    source: 'razorpay',
    description: 'Technical error at Razorpay\'s server.',
    nextSteps: 'Please retry after some time or reach out to Razorpay support.'
  },
  transaction_daily_limit_exceeded: {
    source: 'customer',
    description: 'The customer has exceeded the daily transaction limit set on the card.',
    nextSteps: 'The customer must retry using a different instrument or wait 24 hours.'
  },
  transaction_limit_exceeded: {
    source: 'customer',
    description: 'The customer has exceeded the credit or debit limit set on their card.',
    nextSteps: 'The customer must retry using a different bank\'s card or method.'
  },
  transaction_frequency_limit_exceeded: {
    source: 'customer',
    description: 'NPCI daily transaction frequency limit exhausted for this UPI account.',
    nextSteps: 'Please retry using another payment method.'
  },
  transaction_on_vpa_restricted: {
    source: 'customer',
    description: 'Transaction on this VPA has been temporarily or permanently blocked by the PSP.',
    nextSteps: 'The customer should retry with another UPI ID.'
  },
  upi_app_technical_error: {
    source: 'customer_psp',
    description: 'Technical error occurred at the customer\'s PSP app (GPay / PhonePe / Paytm).',
    nextSteps: 'The customer must retry the payment or try using another UPI app.'
  },
  user_not_eligible: {
    source: 'customer',
    description: 'The customer failed the eligibility check and is not eligible for credit/EMI.',
    nextSteps: 'The customer must retry using a different payment method.'
  },
  user_not_registered_for_netbanking: {
    source: 'customer',
    description: 'The customer\'s bank account is not registered for netbanking.',
    nextSteps: 'The customer should register their account with issuing bank for netbanking.'
  },
  verification_failed: {
    source: 'gateway',
    description: 'Verification of the payment using status check API has failed.',
    nextSteps: 'This is a temporary error. The customer must retry.'
  }
};

/**
 * Resolves any raw error string or code to official Razorpay error details
 * @param {string|object} errorInput 
 * @param {string} customerName
 * @returns {object} { code, sourceInfo, description, nextSteps, rawMessage }
 */
export function resolveRazorpayError(errorInput, customerName = '') {
  let rawStr = '';
  let codeCandidate = '';

  if (typeof errorInput === 'string') {
    rawStr = errorInput.trim();
  } else if (errorInput && typeof errorInput === 'object') {
    rawStr = errorInput.errorMessage || errorInput.reason || errorInput.description || errorInput.message || '';
    codeCandidate = errorInput.errorCode || errorInput.code || errorInput.reason || '';
  }

  const cleanLower = (rawStr || codeCandidate).toLowerCase();
  const cName = customerName || 'Customer';

  // 1. Direct Catalog Match by key
  for (const [key, entry] of Object.entries(RAZORPAY_ERROR_CATALOG)) {
    if (cleanLower.includes(key.toLowerCase()) || codeCandidate.toLowerCase() === key.toLowerCase()) {
      const baseSrc = RAZORPAY_SOURCE_MAP[entry.source] || RAZORPAY_SOURCE_MAP.customer;
      const src = { ...baseSrc, actor: entry.source === 'customer' ? cName : baseSrc.actor };
      return {
        code: key,
        source: entry.source,
        sourceInfo: src,
        description: entry.description,
        nextSteps: entry.nextSteps,
        rawMessage: rawStr || key
      };
    }
  }

  // 2. Pattern heuristics for uncataloged/raw error strings
  let sourceKey = 'customer';
  let desc = rawStr || 'Payment attempt was not completed.';
  let steps = 'Prompt the customer to retry or try an alternative payment method.';

  if (cleanLower.includes('cancel') || cleanLower.includes('did not attempt') || cleanLower.includes('abandon')) {
    sourceKey = 'customer';
    desc = 'Customer opened checkout modal but cancelled or closed the window before completing payment.';
    steps = 'Suggest the customer to re-attempt checkout.';
  } else if (cleanLower.includes('otp') || cleanLower.includes('auth') || cleanLower.includes('pin') || cleanLower.includes('password')) {
    sourceKey = 'customer';
    desc = 'Payment failed during 3D-Secure or OTP authentication.';
    steps = 'Ensure customer enters valid OTP and does not close window.';
  } else if (cleanLower.includes('fund') || cleanLower.includes('balance') || cleanLower.includes('limit')) {
    sourceKey = 'customer';
    desc = 'Insufficient funds or daily card limit exceeded.';
    steps = 'Customer must use another card or payment method.';
  } else if (cleanLower.includes('bank') || cleanLower.includes('cbs') || cleanLower.includes('psp') || cleanLower.includes('downtime')) {
    sourceKey = 'gateway';
    desc = 'Bank or payment gateway faced a technical downtime.';
    steps = 'Advise customer to retry after a short delay or select a different bank.';
  } else if (cleanLower.includes('key') || cleanLower.includes('config') || cleanLower.includes('mode') || cleanLower.includes('merchant')) {
    sourceKey = 'business';
    desc = 'Merchant configuration or API credentials issue.';
    steps = 'Check API integration parameters in dashboard.';
  }

  const baseSrc = RAZORPAY_SOURCE_MAP[sourceKey] || RAZORPAY_SOURCE_MAP.customer;
  const src = { ...baseSrc, actor: sourceKey === 'customer' ? cName : baseSrc.actor };
  return {
    code: codeCandidate || 'payment_failed',
    source: sourceKey,
    sourceInfo: src,
    description: desc,
    nextSteps: steps,
    rawMessage: rawStr || 'Payment attempt failed'
  };
}

/**
 * Extracts real-world payment method instrument details (UPI VPA, Bank Name, Card network/last4)
 * @param {object} order 
 * @returns {object} { type, methodLabel, badgeColor, details }
 */
export function getPaymentInstrumentDetails(order) {
  if (!order) return { methodLabel: 'Online Payment', details: [] };

  const rawMethod = (order.paymentMethod || order.paymentType || '').toLowerCase();
  const lastResp = typeof order.lastGatewayResponse === 'object' && order.lastGatewayResponse ? order.lastGatewayResponse : {};
  const timeline = Array.isArray(order.paymentTimeline) ? order.paymentTimeline : [];
  const payload = timeline.length > 0
    ? (timeline.find(t => t.payload?.method || t.payload?.vpa || t.payload?.bank)?.payload || {})
    : {};

  const merged = { ...lastResp, ...payload };
  const methodKey = (merged.method || rawMethod || 'online').toLowerCase();

  const bankNameMap = {
    sbin: 'State Bank of India (SBIN)',
    hdfc: 'HDFC Bank (HDFC)',
    icic: 'ICICI Bank (ICICI)',
    utib: 'Axis Bank (AXIS)',
    barb_r: 'Bank of Baroda',
    cnrb: 'Canara Bank',
    punb_r: 'Punjab National Bank',
    idib: 'Indian Bank',
    kotak: 'Kotak Mahindra Bank',
    yesb: 'Yes Bank'
  };

  const pspAppMap = {
    gpay: 'Google Pay',
    phonepe: 'PhonePe',
    paytm: 'Paytm UPI',
    bhim: 'BHIM UPI',
    cred: 'CRED UPI',
    amazonpay: 'Amazon Pay UPI'
  };

  if (methodKey.includes('upi')) {
    const vpa = merged.vpa || merged.upiId || order.vpa || '';
    let pspApp = merged.pspApp || merged.app || '';
    if (!pspApp && vpa) {
      if (vpa.includes('ok')) pspApp = 'Google Pay';
      else if (vpa.includes('ybl') || vpa.includes('ibl')) pspApp = 'PhonePe';
      else if (vpa.includes('paytm')) pspApp = 'Paytm UPI';
    }

    const rrn = merged.rrn || merged.utr || merged.acquirer_data?.rrn || merged.acquirer_data?.upi_transaction_id || '';

    return {
      type: 'UPI',
      methodLabel: `UPI ${pspApp ? `(${pspApp})` : ''}`.trim(),
      badgeColor: '#8B5CF6',
      details: [
        ...(vpa ? [{ label: 'UPI VPA / ID', value: vpa }] : []),
        ...(rrn ? [{ label: 'UPI RRN / UTR', value: rrn }] : [])
      ]
    };
  }

  if (methodKey.includes('netbank') || methodKey.includes('net_banking') || merged.bank) {
    const bankCode = (merged.bank || order.bankCode || '').toLowerCase();
    const bankName = bankNameMap[bankCode] || (merged.bank ? String(merged.bank).toUpperCase() : 'Netbanking Bank');

    return {
      type: 'NETBANKING',
      methodLabel: 'Internet Banking',
      badgeColor: '#0284C7',
      details: [
        { label: 'Bank Name', value: bankName },
        ...(merged.bank_transaction_id ? [{ label: 'Bank Ref No', value: merged.bank_transaction_id }] : [])
      ]
    };
  }

  if (methodKey.includes('card')) {
    const cardObj = typeof merged.card === 'object' && merged.card ? merged.card : {};
    const network = cardObj.network || merged.cardNetwork || 'Credit/Debit Card';
    const type = (cardObj.type || merged.cardType || 'Card').toUpperCase();
    const last4 = cardObj.last4 || merged.cardLast4 || '****';
    const issuer = cardObj.issuer || cardObj.bank || '';

    return {
      type: 'CARD',
      methodLabel: `${network} ${type}`,
      badgeColor: '#3B82F6',
      details: [
        { label: 'Card Number', value: `•••• •••• •••• ${last4}` },
        ...(issuer ? [{ label: 'Issuer Bank', value: issuer }] : [])
      ]
    };
  }

  if (methodKey.includes('wallet')) {
    const walletName = merged.wallet ? (pspAppMap[merged.wallet.toLowerCase()] || merged.wallet.toUpperCase()) : 'Mobile Wallet';
    return {
      type: 'WALLET',
      methodLabel: walletName,
      badgeColor: '#EC4899',
      details: []
    };
  }

  if (methodKey.includes('cod') || methodKey.includes('cash')) {
    return {
      type: 'COD',
      methodLabel: 'Cash on Delivery (COD)',
      badgeColor: '#F59E0B',
      details: [
        { label: 'Collection Status', value: order.paymentStatus === 'Paid' ? 'Collected on Delivery' : 'Pending Collection' }
      ]
    };
  }

  return {
    type: 'ONLINE',
    methodLabel: order.paymentMethod || 'Razorpay Gateway',
    badgeColor: '#3B82F6',
    details: []
  };
}
