/**
 * Fonctions utilitaires pour travailler avec les UUIDs
 */

/**
 * Valide si une chaîne est un UUID valide au format RFC4122
 * 
 * @param id - Chaîne à valider comme UUID
 * @returns true si la chaîne est un UUID valide, sinon false
 */
export const isValidUUID = (id: any): boolean => {
  if (id === null || id === undefined) return false;
  
  // Si c'est un nombre, on l'accepte car il sera converti en UUID côté backend
  if (typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id))) {
    return true;
  }
  
  // Validation UUID standard
  if (typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Convertit un ID en chaîne UUID ou en chaîne compatible avec notre API
 * Si l'ID est déjà un UUID, il est retourné tel quel
 * Si c'est un nombre, il est converti en chaîne pour être traité par le backend
 * Si c'est null ou undefined, retourne une chaîne vide
 * 
 * @param id - Identifiant à convertir
 * @returns La représentation chaîne de l'identifiant ou chaîne vide si null/undefined
 */
export const ensureUUID = (id: string | number | null | undefined): string => {
  if (id === null || id === undefined) return '';
  return String(id); // Le backend se chargera de la conversion
};

/**
 * Vérifie si deux UUIDs sont identiques, en ignorant la casse
 * 
 * @param uuid1 - Premier UUID à comparer
 * @param uuid2 - Second UUID à comparer
 * @returns true si les UUIDs sont identiques, sinon false
 */
export const areUUIDsEqual = (uuid1: string, uuid2: string): boolean => {
  if (!uuid1 || !uuid2) return false;
  return uuid1.toLowerCase() === uuid2.toLowerCase();
};

/**
 * Crée un objet de recherche d'UUID pour rechercher rapidement dans un tableau
 * 
 * @param uuidArray - Tableau d'UUIDs à indexer
 * @returns Un objet avec les UUIDs comme clés
 */
export const createUUIDLookup = (uuidArray: string[]): Record<string, boolean> => {
  const lookup: Record<string, boolean> = {};
  for (const uuid of uuidArray) {
    if (uuid) {
      lookup[uuid.toLowerCase()] = true;
    }
  }
  return lookup;
};
