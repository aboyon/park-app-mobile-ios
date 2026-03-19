const es = {
  // Tabs
  tabs: {
    home: 'Inicio',
    reservations: 'Reservas',
    profile: 'Perfil',
    vehicles: 'Vehículos',
    payments: 'Pagos',
  },

  // Common
  common: {
    back: '← Atrás',
    retry: 'Reintentar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    remove: 'Eliminar',
    saveChanges: 'Guardar cambios',
    connectionError: 'Error de conexión',
    default: 'Por defecto',
    kmAway: 'a %{distance} km',
    hours: 'h',
  },

  // Login
  login: {
    appName: 'Park App',
    subtitle: 'Encontrá y reservá estacionamientos cercanos',
    email: 'Correo',
    password: 'Contraseña',
    signIn: 'Ingresar',
    invalidCredentials: 'Credenciales inválidas',
    noAccount: '¿No tenés cuenta? ',
    createAccount: 'Crear cuenta',
  },

  // Signup
  signup: {
    title: 'Crear cuenta',
    name: 'Nombre',
    fullNamePlaceholder: 'Nombre completo',
    email: 'Correo',
    password: 'Contraseña',
    confirmPassword: 'Confirmar contraseña',
    confirmPasswordPlaceholder: 'Confirmar contraseña',
    passwordMismatch: 'Las contraseñas no coinciden',
    couldNotCreate: 'No se pudo crear la cuenta',
    signUp: 'Crear cuenta',
    haveAccount: '¿Ya tenés cuenta? ',
    login: 'Ingresar',
  },

  // Home / Nearby Parkings
  home: {
    title: 'Estacionamientos cercanos',
    waitingForLocation: 'Esperando ubicación...',
    foundParkings: 'Se encontraron %{count} estacionamientos cercanos',
    couldNotFetch: 'No se pudieron obtener los estacionamientos',
    notDriving: 'No estás conduciendo — toca actualizar para buscar',
    searchNearby: 'Actualizar',
    searching: 'Buscando…',
    availableNow: 'DISPONIBLES AHORA',
    flexible: 'Flexible',
    strict: 'Estricto',
  },

  // Reservations list
  reservations: {
    title: 'Mis reservas',
    sectionLabel: 'RESERVAS',
    empty: 'No hay reservas aún',
    couldNotLoad: 'No se pudieron cargar las reservas',
    status: {
      pending: 'Pendiente',
      in_progress: 'En curso',
      completed: 'Completada',
      expired: 'Expirada',
      cancelled: 'Cancelada',
    },
  },

  // Reservation detail
  reservationDetail: {
    vehicle: 'Vehículo',
    started: 'Inicio',
    ended: 'Fin',
    duration: 'Duración',
    payments: 'Pagos',
    cancelReservation: 'Cancelar reserva',
    couldNotCancel: 'No se pudo cancelar la reserva',
    product: 'Producto',
    paymentMethod: 'Método de pago',
    date: 'Fecha',
    reference: 'Referencia',
    description: 'Descripción',
    paymentStatus: {
      completed: 'Completado',
      pending: 'Pendiente',
      failed: 'Fallido',
    },
  },

  // Profile
  profile: {
    sectionLabel: 'PERFIL',
    name: 'Nombre',
    namePlaceholder: 'Tu nombre',
    notificationDistance: 'Distancia de notificación',
    appearance: 'APARIENCIA',
    appearanceHint: 'Elegí cómo se ve la app',
    theme: {
      system: 'Sistema',
      light: 'Claro',
      dark: 'Oscuro',
    },
    language: 'IDIOMA',
    languageLabel: 'Idioma',
    saveChanges: 'Guardar cambios',
    changesSaved: 'Cambios guardados',
    couldNotSave: 'No se pudieron guardar los cambios',
    couldNotLoad: 'No se pudo cargar el perfil',
    logout: 'Cerrar sesión',
  },

  // Language names
  language: {
    en: 'English',
    es: 'Español',
  },

  // Vehicles
  vehicles: {
    title: 'Mis vehículos',
    add: '+ Agregar',
    empty: 'No hay vehículos aún',
    addFirst: 'Agregar tu primer vehículo',
    sectionDetails: 'DETALLES',
    licensePlate: 'Patente',
    licensePlatePlaceholder: 'ej. AB-12-CD',
    setAsDefault: 'Establecer como predeterminado',
    sectionType: 'TIPO',
    saveChanges: 'Guardar cambios',
    addVehicle: 'Agregar vehículo',
    licensePlateRequired: 'La patente es requerida',
    couldNotSave: 'No se pudo guardar el vehículo',
    couldNotLoad: 'No se pudieron cargar los vehículos',
    defaultBadge: 'Predeterminado',
    types: {
      car: 'Auto',
      truck: 'Camión',
      pickup: 'Pickup',
      suv: 'SUV',
      motorcycle: 'Moto',
    },
  },

  // Payments
  payments: {
    title: 'Métodos de pago',
    addButton: '+ Agregar método de pago',
    empty: 'No hay métodos de pago aún',
    removeTitle: 'Eliminar método de pago',
    removeMessage: '¿Eliminar %{title}?',
    setDefault: 'Predeterminar',
    sectionType: 'TIPO',
    sectionCardDetails: 'DATOS DE LA TARJETA',
    sectionAccountDetails: 'DATOS DE LA CUENTA',
    sectionOptions: 'OPCIONES',
    setAsDefault: 'Establecer como predeterminado',
    cardNumber: 'Número de tarjeta',
    cardNumberPlaceholder: '0000 0000 0000 0000',
    cardHolder: 'Nombre del titular',
    cardHolderPlaceholder: 'Nombre en la tarjeta',
    expiration: 'Vencimiento',
    expirationPlaceholder: 'MM/AAAA',
    cvv: 'CVV',
    cvvPlaceholder: 'ej. 123',
    cbu: 'CBU',
    cbuPlaceholder: 'CBU de 22 dígitos',
    bankName: 'Banco',
    bankNamePlaceholder: 'ej. Banco Galicia',
    accountHolder: 'Titular de la cuenta',
    accountHolderPlaceholder: 'Nombre completo',
    addPaymentMethod: 'Agregar método de pago',
    cardNumberRequired: 'El número de tarjeta es requerido',
    cardHolderRequired: 'El nombre del titular es requerido',
    expirationRequired: 'El vencimiento es requerido',
    cbuRequired: 'El CBU es requerido',
    bankNameRequired: 'El nombre del banco es requerido',
    accountHolderRequired: 'El titular de la cuenta es requerido',
    couldNotAdd: 'No se pudo agregar el método de pago',
    couldNotLoad: 'No se pudieron cargar los métodos de pago',
    types: {
      credit_card: 'Tarjeta de crédito',
      debit: 'Débito',
    },
    creditCardTitle: 'Tarjeta de crédito',
    debitTitle: 'Cuenta débito',
  },

  // Active Reservation
  activeReservation: {
    reservedAt: 'Reservaste un lugar en',
    parkedAt: 'Estás estacionado en',
    reservedAtLabel: 'Reservado a las',
    hourlyRate: 'Tarifa por hora',
    parkingDuration: 'Duración del estacionamiento',
    rate: 'Tarifa',
    billedHours: 'Horas facturadas',
    totalCost: 'Costo total',
    noRateAvailable: 'No hay tarifa disponible para el horario actual',
    toArrive: 'para llegar — la reserva se cancela después de esto',
    confirmStart: 'Tu sesión de estacionamiento comenzará inmediatamente y se aplicarán los cargos ahora. ¿Querés continuar?',
    yesStart: 'Sí, iniciar estacionamiento',
    notYet: 'Todavía no',
    startParking: 'Iniciar estacionamiento',
    cancelReservation: 'Cancelar reserva',
    couldNotCancel: 'No se pudo cancelar la reserva',
    couldNotStart: 'No se pudo iniciar la reserva',
  },

  // Parking Detail
  parkingDetail: {
    availableSlots: 'Lugares disponibles',
    reservationExpires: 'La reserva expira después de',
    min: 'min',
    todayRates: 'Tarifas de hoy',
    warningCharges: 'ADVERTENCIA: Se aplicarán cargos si no llegás en %{minutes} min',
    selectVehicle: 'SELECCIONÁ TU VEHÍCULO',
    noVehicles: 'No se encontraron vehículos. Agregá uno en la pestaña Vehículos.',
    confirmReservation: 'Confirmar reserva',
    noSlotsAvailable: 'Sin lugares disponibles',
    reserveSpot: 'Reservar un lugar',
    openMaps: 'Abrir en Mapas',
    couldNotLoadData: 'No se pudieron cargar los datos',
    couldNotReserve: 'No se pudo completar la reserva',
    defaultVehicleSuffix: ' · Predeterminado',
    noPaymentTitle: 'Sin método de pago',
    noPaymentMessage: 'Necesitás agregar un método de pago antes de reservar un lugar.',
    addPaymentMethod: 'Agregar método de pago',
  },

  // Require Vehicle Screen
  requireVehicle: {
    title: 'Agregar un vehículo',
    subtitle: 'Necesitás al menos un vehículo registrado para usar la app.',
    addVehicle: 'Agregar vehículo',
  },

  // Notifications
  notifications: {
    reservationCancelled: 'Tu reserva fue cancelada.',
    reservationCancelledByAdmin: 'Tu reserva fue cancelada por el estacionamiento.',
    reservationExpired: 'Tu reserva expiró.',
    reservationExpiredByAdmin: 'Tu reserva fue expirada por el estacionamiento.',
    thankYouParking: '¡Gracias por estacionar en %{parking}!',
  },
};

export default es;
