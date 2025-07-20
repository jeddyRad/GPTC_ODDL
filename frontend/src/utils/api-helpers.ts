import { isValidUUID } from './uuid-helpers';

/**
 * Configuration centrale des API
 */

// URL de base de l'API
// IMPORTANT : ne pas inclure /api à la fin !
export const API_BASE_URL = 'http://localhost:8000';

/**
 * Options par défaut pour les requêtes fetch
 */
export const defaultFetchOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Ajoute le token d'authentification aux options de requête
 */
export const withAuth = (options: RequestInit = {}): RequestInit => {
  const token = localStorage.getItem('authToken');
  
  return {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

/**
 * Gère les erreurs de requête API
 */
export const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    
    try {
      errorData = JSON.parse(errorText);
    } catch (e) {
      errorData = { detail: errorText || response.statusText };
    }
    
    throw errorData;
  }
  
  return response.json();
};

/**
 * Valide un ID UUID avant les requêtes API
 * Renvoie une erreur si l'ID n'est pas un UUID valide
 */
export const validateUUID = (id: string, resourceName = 'ressource'): void => {
  if (!isValidUUID(id)) {
    throw new Error(`ID invalide pour ${resourceName}: ${id}. L'ID doit être un UUID valide.`);
  }
};

/**
 * Fonction générique pour récupérer une ressource par son UUID
 */
export const fetchResourceById = async (resourcePath: string, id: string, resourceName = 'ressource') => {
  validateUUID(id, resourceName);
  
  const response = await fetch(
    `${API_BASE_URL}/${resourcePath}/${id}/`, 
    withAuth()
  );
  
  return handleApiError(response);
};

/**
 * Fonction générique pour créer une ressource
 */
export const createResource = async (resourcePath: string, data: any) => {
  const response = await fetch(
    `${API_BASE_URL}/${resourcePath}/`, 
    {
      method: 'POST',
      ...withAuth(),
      body: JSON.stringify(data),
    }
  );
  
  return handleApiError(response);
};

/**
 * Fonction générique pour mettre à jour une ressource par son UUID
 */
export const updateResourceById = async (resourcePath: string, id: string, data: any, resourceName = 'ressource') => {
  validateUUID(id, resourceName);
  
  const response = await fetch(
    `${API_BASE_URL}/${resourcePath}/${id}/`, 
    {
      method: 'PUT',
      ...withAuth(),
      body: JSON.stringify(data),
    }
  );
  
  return handleApiError(response);
};

/**
 * Fonction générique pour supprimer une ressource par son UUID
 */
export const deleteResourceById = async (resourcePath: string, id: string, resourceName = 'ressource') => {
  validateUUID(id, resourceName);
  
  const response = await fetch(
    `${API_BASE_URL}/${resourcePath}/${id}/`, 
    {
      method: 'DELETE',
      ...withAuth(),
    }
  );
  
  if (!response.ok) {
    return handleApiError(response);
  }
  
  return true;
};
