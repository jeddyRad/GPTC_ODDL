/**
 * Ce fichier est maintenu pour la compatibilité avec le code existant.
 * Il réexporte simplement l'instance API principale de api.ts.
 * Pour les nouveaux développements, utilisez plutôt l'importation directe de apiService depuis api.ts
 */

import { apiService } from './api';

// Réexport de l'instance API pour maintenir la compatibilité
const api = apiService.api;

// Type d'erreur personnalisée pour l'API (conservée pour la compatibilité)
export interface ApiErrorResponse {
    detail?: string;
    message?: string;
    errors?: Record<string, string[]>;
    status?: number;
    code?: string;
}

// Exportation par défaut pour la compatibilité avec le code existant
export default api;
