import React, { useEffect, useState } from 'react';
import { ErrorDisplay } from './ErrorDisplay';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface GlobalError {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  timestamp: Date;
  dismissed: boolean;
}

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

export const GlobalErrorHandler: React.FC<GlobalErrorHandlerProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [errors, setErrors] = useState<GlobalError[]>([]);
  const { t } = useTranslation();

  // Intercepter les erreurs globales
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const error: GlobalError = {
        id: Date.now().toString(),
        message: event.message || 'Une erreur inattendue s\'est produite',
        type: 'error',
        timestamp: new Date(),
        dismissed: false
      };
      
      setErrors(prev => [...prev, error]);
      
      // Empêcher la propagation de l'erreur
      event.preventDefault();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error: GlobalError = {
        id: Date.now().toString(),
        message: event.reason?.message || 'Une promesse a été rejetée',
        type: 'error',
        timestamp: new Date(),
        dismissed: false
      };
      
      setErrors(prev => [...prev, error]);
      
      // Empêcher la propagation de l'erreur
      event.preventDefault();
    };

    // Écouter les erreurs globales
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Nettoyer les erreurs anciennes
  useEffect(() => {
    const cleanup = setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      setErrors(prev => prev.filter(error => 
        error.timestamp > oneHourAgo && !error.dismissed
      ));
    }, 5 * 60 * 1000); // Nettoyer toutes les 5 minutes

    return () => clearInterval(cleanup);
  }, []);

  const dismissError = (id: string) => {
    setErrors(prev => 
      prev.map(error => 
        error.id === id ? { ...error, dismissed: true } : error
      )
    );
  };

  const dismissAllErrors = () => {
    setErrors(prev => 
      prev.map(error => ({ ...error, dismissed: true }))
    );
  };

  // Filtrer les erreurs non rejetées
  const activeErrors = errors.filter(error => !error.dismissed);

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      {/* Affichage des erreurs globales */}
      {activeErrors.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
          {activeErrors.map(error => (
            <ErrorDisplay
              key={error.id}
              type={error.type}
              message={error.message}
              onDismiss={() => dismissError(error.id)}
              className="shadow-lg"
            />
          ))}
          
          {activeErrors.length > 1 && (
            <div className="bg-white rounded-lg shadow-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {activeErrors.length} {t('common.errors')}
                </span>
                <button
                  onClick={dismissAllErrors}
                  className="text-sm text-blue-600 hover:text-blue-800"
                  title={t('common.closeAll')}
                  aria-label={t('common.closeAll')}
                >
                  {t('common.closeAll')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

// Hook pour ajouter des erreurs manuellement
export const useGlobalError = () => {
  const [errors, setErrors] = useState<GlobalError[]>([]);

  const addError = (message: string, type: 'error' | 'warning' | 'info' = 'error') => {
    const error: GlobalError = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date(),
      dismissed: false
    };
    
    setErrors(prev => [...prev, error]);
  };

  const dismissError = (id: string) => {
    setErrors(prev => 
      prev.map(error => 
        error.id === id ? { ...error, dismissed: true } : error
      )
    );
  };

  const clearErrors = () => {
    setErrors([]);
  };

  return {
    errors: errors.filter(error => !error.dismissed),
    addError,
    dismissError,
    clearErrors
  };
};