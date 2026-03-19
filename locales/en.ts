const en = {
  // Tabs
  tabs: {
    home: 'Home',
    reservations: 'Reservations',
    profile: 'Profile',
    vehicles: 'Vehicles',
    payments: 'Payments',
  },

  // Common
  common: {
    back: '← Back',
    retry: 'Retry',
    cancel: 'Cancel',
    close: 'Close',
    remove: 'Remove',
    saveChanges: 'Save Changes',
    connectionError: 'Connection error',
    default: 'Default',
    kmAway: '%{distance} km away',
    hours: 'h',
  },

  // Login
  login: {
    appName: 'Park App',
    subtitle: 'Find and reserve parking spots nearby',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign In',
    invalidCredentials: 'Invalid credentials',
    noAccount: "Don't have an account? ",
    createAccount: 'Create account',
  },

  // Signup
  signup: {
    title: 'Create Account',
    name: 'Name',
    fullNamePlaceholder: 'Full name',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: 'Confirm password',
    passwordMismatch: 'Passwords do not match',
    couldNotCreate: 'Could not create account',
    signUp: 'Create Account',
    haveAccount: 'Already have an account? ',
    login: 'Log in',
  },

  // Home / Nearby Parkings
  home: {
    title: 'Nearby Parkings',
    waitingForLocation: 'Waiting for location...',
    foundParkings: 'Found %{count} parkings nearby',
    couldNotFetch: 'Could not fetch parkings',
    notDriving: 'Not driving — tap refresh to search',
    searchNearby: 'Search Nearby Parkings',
    searching: 'Searching…',
    availableNow: 'AVAILABLE NOW',
    flexible: 'Flexible',
    strict: 'Strict',
  },

  // Reservations list
  reservations: {
    title: 'My Reservations',
    sectionLabel: 'RESERVATIONS',
    empty: 'No reservations yet',
    couldNotLoad: 'Could not load reservations',
    status: {
      pending: 'Pending',
      in_progress: 'In progress',
      completed: 'Completed',
      expired: 'Expired',
      cancelled: 'Cancelled',
    },
  },

  // Reservation detail
  reservationDetail: {
    vehicle: 'Vehicle',
    started: 'Started',
    ended: 'Ended',
    duration: 'Duration',
    payments: 'Payments',
    cancelReservation: 'Cancel Reservation',
    couldNotCancel: 'Could not cancel reservation',
    product: 'Product',
    paymentMethod: 'Payment method',
    date: 'Date',
    reference: 'Reference',
    description: 'Description',
    paymentStatus: {
      completed: 'Completed',
      pending: 'Pending',
      failed: 'Failed',
    },
  },

  // Profile
  profile: {
    sectionLabel: 'PROFILE',
    name: 'Name',
    namePlaceholder: 'Your name',
    notificationDistance: 'Notification distance',
    appearance: 'APPEARANCE',
    appearanceHint: 'Choose how the app looks',
    theme: {
      system: 'System',
      light: 'Light',
      dark: 'Dark',
    },
    language: 'LANGUAGE',
    languageLabel: 'Language',
    saveChanges: 'Save Changes',
    changesSaved: 'Changes saved',
    couldNotSave: 'Could not save changes',
    couldNotLoad: 'Could not load profile',
    logout: 'Logout',
  },

  // Language names
  language: {
    en: 'English',
    es: 'Español',
  },

  // Vehicles
  vehicles: {
    title: 'My Vehicles',
    add: '+ Add',
    empty: 'No vehicles yet',
    addFirst: 'Add your first vehicle',
    sectionDetails: 'DETAILS',
    licensePlate: 'License Plate',
    licensePlatePlaceholder: 'e.g. AB-12-CD',
    setAsDefault: 'Set as default',
    sectionType: 'TYPE',
    saveChanges: 'Save Changes',
    addVehicle: 'Add Vehicle',
    licensePlateRequired: 'License plate is required',
    couldNotSave: 'Could not save vehicle',
    couldNotLoad: 'Could not load vehicles',
    defaultBadge: 'Default',
    types: {
      car: 'Car',
      truck: 'Truck',
      pickup: 'Pickup',
      suv: 'SUV',
      motorcycle: 'Motorcycle',
    },
  },

  // Payments
  payments: {
    title: 'Payment Methods',
    addButton: '+ Add Payment Method',
    empty: 'No payment methods yet',
    removeTitle: 'Remove payment method',
    removeMessage: 'Remove %{title}?',
    setDefault: 'Set default',
    sectionType: 'TYPE',
    sectionCardDetails: 'CARD DETAILS',
    sectionAccountDetails: 'ACCOUNT DETAILS',
    sectionOptions: 'OPTIONS',
    setAsDefault: 'Set as default',
    cardNumber: 'Card number',
    cardNumberPlaceholder: '0000 0000 0000 0000',
    cardHolder: 'Cardholder name',
    cardHolderPlaceholder: 'Name on card',
    expiration: 'Expiration',
    expirationPlaceholder: 'MM/YYYY',
    cvv: 'CVV',
    cvvPlaceholder: 'e.g. 123',
    cbu: 'CBU',
    cbuPlaceholder: '22-digit CBU',
    bankName: 'Bank name',
    bankNamePlaceholder: 'e.g. Banco Galicia',
    accountHolder: 'Account holder',
    accountHolderPlaceholder: 'Full name',
    addPaymentMethod: 'Add Payment Method',
    cardNumberRequired: 'Card number is required',
    cardHolderRequired: 'Cardholder name is required',
    expirationRequired: 'Expiration is required',
    cbuRequired: 'CBU is required',
    bankNameRequired: 'Bank name is required',
    accountHolderRequired: 'Account holder is required',
    couldNotAdd: 'Could not add payment method',
    couldNotLoad: 'Could not load payment methods',
    types: {
      credit_card: 'Credit Card',
      debit: 'Debit',
    },
    creditCardTitle: 'Credit Card',
    debitTitle: 'Debit Account',
  },

  // Active Reservation
  activeReservation: {
    reservedAt: 'You reserved a spot at',
    parkedAt: "You're parked at",
    reservedAtLabel: 'Reserved at',
    hourlyRate: 'Hourly rate',
    parkingDuration: 'Parking duration',
    rate: 'Rate',
    billedHours: 'Billed hours',
    totalCost: 'Total cost',
    noRateAvailable: 'No rate available for the current time',
    toArrive: 'to arrive — reservation cancels after this',
    confirmStart: 'Your parking session will start immediately and charges will begin now. Are you ready to proceed?',
    yesStart: 'Yes, start parking',
    notYet: 'Not yet',
    startParking: 'Start Parking',
    cancelReservation: 'Cancel Reservation',
    couldNotCancel: 'Could not cancel reservation',
    couldNotStart: 'Could not start reservation',
  },

  // Parking Detail
  parkingDetail: {
    availableSlots: 'Available slots',
    reservationExpires: 'Reservation expires after',
    min: 'min',
    todayRates: "Today's rates",
    warningCharges: "WARNING: Charges apply if you don't arrive within %{minutes} min",
    selectVehicle: 'SELECT YOUR VEHICLE',
    noVehicles: 'No vehicles found. Add one in the Vehicles tab first.',
    confirmReservation: 'Confirm Reservation',
    noSlotsAvailable: 'No Slots Available',
    reserveSpot: 'Reserve a Spot',
    openMaps: 'Open in Maps',
    couldNotLoadData: 'Could not load data',
    couldNotReserve: 'Could not complete reservation',
    defaultVehicleSuffix: ' · Default',
    noPaymentTitle: 'No payment method',
    noPaymentMessage: 'You need to add a payment method before reserving a spot.',
    addPaymentMethod: 'Add Payment Method',
  },

  // Require Vehicle Screen
  requireVehicle: {
    title: 'Add a Vehicle',
    subtitle: 'You need at least one vehicle registered before you can use the app.',
    addVehicle: 'Add Vehicle',
  },

  // Notifications
  notifications: {
    reservationCancelled: 'Your reservation has been cancelled.',
    reservationCancelledByAdmin: 'Your reservation has been cancelled by the parking.',
    reservationExpired: 'Your reservation has expired.',
    reservationExpiredByAdmin: 'Your reservation has been expired by the parking.',
    thankYouParking: 'Thanks for parking at %{parking}!',
  },
};

export default en;
