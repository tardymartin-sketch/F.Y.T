// ===========================================
// F.Y.T - Layouts Index
// src/layouts/index.ts
// Export centralisé des layouts
// ===========================================

// Mobile layout (nouveau nom)
export { MobileLayout, MobileLayoutMinimal } from './MobileLayout';

// Alias pour compatibilité avec l'ancien code
export { AthleteLayout, AthleteLayoutMinimal } from './MobileLayout';

// Desktop layout
export { CoachLayout } from './CoachLayout';
// Alias pour futur renommage
export { CoachLayout as DesktopLayout } from './CoachLayout';
