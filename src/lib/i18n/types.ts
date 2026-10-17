/**
 * src/lib/i18n/types.ts
 * Global Type Definitions for APE-PAREL i18n, Multi-Currency & Settings Architecture
 */

export type Locale = 'th' | 'en' | 'ja';

export type Currency = 'THB' | 'USD' | 'JPY' | 'EUR';

export type FontStyle = 'streetwear' | 'technical' | 'minimal';

export type StudioQuality = 'high' | 'performance';

export type StudioViewPreset = 'FRONT' | 'BACK' | 'ISOMETRIC';

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
  rateFromTHB: number; // multiplier: amountInTHB * rateFromTHB = amountInTarget
  decimals: number;
}

export interface UserPreferences {
  locale: Locale;
  currency: Currency;
  fontStyle: FontStyle;
  studioQuality: StudioQuality;
  fabricPhysicsEnabled: boolean;
  defaultStudioView: StudioViewPreset;
  toastNotifications: boolean;
  soundEnabled: boolean;
  orderAlerts: boolean;
}

export interface TranslationDictionary {
  common: {
    appName: string;
    tagline: string;
    save: string;
    saved: string;
    cancel: string;
    close: string;
    confirm: string;
    loading: string;
    reset: string;
    active: string;
    free: string;
    all: string;
    engineStatus: string;
  };
  nav: {
    studio: string;
    marketplace: string;
    myOrders: string;
    creatorHub: string;
    production: string;
    admin: string;
    customize: string;
    signIn: string;
    register: string;
    signOut: string;
    chatInbox: string;
    notifications: string;
    settings: string;
    vault: string;
    about: string;
    changelog: string;
  };
  settings: {
    title: string;
    subtitle: string;
    tabs: {
      general: string;
      studio: string;
      notifications: string;
      privacy: string;
    };
    languageSection: {
      title: string;
      desc: string;
    };
    currencySection: {
      title: string;
      desc: string;
      baseNote: string;
    };
    fontSection: {
      title: string;
      desc: string;
    };
    studioSection: {
      qualityTitle: string;
      qualityDesc: string;
      physicsTitle: string;
      physicsDesc: string;
      viewTitle: string;
      viewDesc: string;
    };
    notificationSection: {
      toastTitle: string;
      toastDesc: string;
      soundTitle: string;
      soundDesc: string;
      alertsTitle: string;
      alertsDesc: string;
    };
    privacySection: {
      cookieTitle: string;
      cookieDesc: string;
      manageCookies: string;
      cacheTitle: string;
      cacheDesc: string;
      clearCache: string;
      cacheCleared: string;
    };
  };
  marketplace: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    filterAll: string;
    price: string;
    royalty: string;
    applyToStudio: string;
  };
  studio: {
    customizerTitle: string;
    view3d: string;
    view2d: string;
    viewSplit: string;
    addToCart: string;
    orderNow: string;
    frontSurface: string;
    backSurface: string;
    tapToOrbit: string;
    tapToScroll: string;
    addArtwork: string;
    layers: string;
    supplierPolicyBtn: string;
    supplierPolicyTitle: string;
    leadTime: string;
    claimPolicy: string;
    printTolerance: string;
  };
  home: {
    heroTag: string;
    heroTitle: string;
    heroSubtitle: string;
    startStudio: string;
    browseMarket: string;
    featuresTitle: string;
    feature3dTitle: string;
    feature3dDesc: string;
    featureRoyaltyTitle: string;
    featureRoyaltyDesc: string;
    featureSpeedTitle: string;
    featureSpeedDesc: string;
  };
  livePricing: {
    title: string;
    garmentBase: string;
    printFee: string;
    artworkLicenses: string;
    packaging: string;
    shipping: string;
    total: string;
    quantity: string;
    calculating: string;
    approxEquivalent: string;
    verifiedContract: string;
    breakdownTitle: string;
    hideDetails: string;
    viewDetails: string;
    unitPrice: string;
    pieces: string;
  };
  orders: {
    title: string;
    subtitle: string;
    orderId: string;
    date: string;
    status: string;
    totalAmount: string;
    viewDetails: string;
    noOrders: string;
    statusPending: string;
    statusPrinting: string;
    statusShipped: string;
    statusCompleted: string;
    statusCancelled: string;
  };
  footer: {
    brandDesc: string;
    newsletterTitle: string;
    newsletterDesc: string;
    subscribeBtn: string;
    subscribePlaceholder: string;
    consentText: string;
    rights: string;
    privacy: string;
    terms: string;
    cookies: string;
    cookieSettings: string;
    settingsLink: string;
    verifiedNetwork: string;
    escrowProtection: string;
    creatorProtection: string;
    ipTakedown: string;
    disputeCenter: string;
    supplierCodeOfConduct: string;
    marketplaceDisclaimer: string;
    trackOrder: string;
    supplierPortal: string;
    creatorHub: string;
    savedVault: string;
    platformGovernance: string;
    ecosystemPortals: string;
    customerUtilities: string;
    about: string;
    changelog: string;
    version: string;
  };
}
