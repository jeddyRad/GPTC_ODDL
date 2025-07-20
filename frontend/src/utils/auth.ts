/**
 * Utilitaire pour gérer les jetons d'authentification
 */

export const TOKEN_KEY = 'authToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';

/**
 * Récupère le jeton JWT depuis le stockage local
 * @returns {string|null} Le jeton JWT ou null s'il n'existe pas
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Enregistre le jeton JWT dans le stockage local
 * @param {string} token - Le jeton JWT
 */
export function setToken(token: string, refreshToken?: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

/**
 * Supprime le jeton JWT du stockage local
 */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Vérifie si un token est présent
 * @returns {boolean} true si un token est présent, false sinon
 */
export function hasToken(): boolean {
  return !!getToken();
}

/**
 * Décode le jeton JWT sans vérification de signature
 * @param {string} token - Le jeton JWT
 * @returns {any} Le contenu décodé du jeton ou null si invalid
 */
export function decodeToken(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Vérifie si le jeton JWT est expiré
 * @returns {boolean} true si le jeton est expiré, false sinon
 */
export function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;

  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    // exp est en secondes, Date.now() est en millisecondes
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
}

/**
 * Rafraîchit le token JWT si nécessaire
 * @returns {Promise<boolean>} true si le token a été rafraîchi avec succès, false sinon
 */
export async function refreshTokenIfNeeded(): Promise<boolean> {
  // Si pas de token ou pas expiré, pas besoin de rafraîchir
  if (!hasToken()) return false;
  
  // Si pas de token de rafraîchissement, impossible de rafraîchir
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;
  
  // Si le token n'est pas expiré, pas besoin de rafraîchir
  const token = getToken();
  if (!token) return false;
  
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return false;
    
    // Si le token expire dans moins de 5 minutes, on le rafraîchit
    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();
    const fiveMinutesInMs = 5 * 60 * 1000;
    
    if (expirationTime - currentTime > fiveMinutesInMs) {
      // Pas besoin de rafraîchir
      return true;
    }
    
    // Rafraîchir le token
    const response = await fetch('http://localhost:8000/api/token/refresh/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh: refreshToken
      }),
    });
    
    if (!response.ok) {
      throw new Error('Échec du rafraîchissement du token');
    }
    
    const data = await response.json();
    setToken(data.access);
    return true;
  } catch (error) {
    console.error('Erreur lors du rafraîchissement du token:', error);
    return false;
  }
}
