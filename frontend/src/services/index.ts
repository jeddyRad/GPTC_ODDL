/**
 * Services API centralisés
 * Réexporte tous les services pour faciliter les imports
 */

// Service API principal
export { apiService } from './api';

// Services spécifiques
export * from './serviceService';
export * from './authService';
export * from './calendarService';

// Note : apiClient.ts est maintenu pour la compatibilité, mais n'est pas exporté
// Préférez utiliser apiService directement
