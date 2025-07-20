import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { withTranslation, WithTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

// Version fonctionnelle de ErrorBoundary avec i18n
export const ErrorBoundary: React.FC<Props> = ({ children, fallback, onError }) => {
  const { t } = useTranslation();
  const [state, setState] = React.useState<State>({ hasError: false });

  const handleRetry = () => {
    setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleGoBack = () => {
    window.history.back();
  };

  // Simule le comportement de componentDidCatch
  React.useEffect(() => {
    if (state.hasError && state.error && state.errorInfo) {
      onError?.(state.error, state.errorInfo);
    }
    // eslint-disable-next-line
  }, [state.hasError, state.error, state.errorInfo]);

  if (state.hasError) {
    if (fallback) {
      return <>{fallback}</>;
      }
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
            {t('errorBoundary.title', "Oups ! Quelque chose s'est mal passé")}
            </h1>
            <p className="text-gray-600 text-center mb-6">
            {t('errorBoundary.description', "Une erreur inattendue s'est produite. Veuillez réessayer ou contacter le support si le problème persiste.")}
            </p>
          {import.meta.env.DEV && state.error && (
              <details className="mb-4 p-3 bg-gray-100 rounded text-sm">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                {t('errorBoundary.details', 'Détails de l\'erreur (développement)')}
                </summary>
                <div className="space-y-2">
                  <div>
                  <strong>Message:</strong> {state.error?.message}
                  </div>
                  <div>
                    <strong>Stack:</strong>
                    <pre className="mt-1 text-xs bg-gray-200 p-2 rounded overflow-auto">
                    {state.error?.stack}
                    </pre>
                  </div>
                {state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 text-xs bg-gray-200 p-2 rounded overflow-auto">
                      {state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
              onClick={handleRetry}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
              {t('common.retry')}
              </button>
              <button
              onClick={handleGoBack}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
              </button>
              <button
              onClick={handleGoHome}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Home className="w-4 h-4 mr-2" />
              {t('common.home')}
              </button>
            </div>
          </div>
        </div>
      );
    }
  return <>{children}</>;
};

// Composant spécialisé pour les erreurs de page
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    onError={(error: Error, errorInfo: ErrorInfo) => {
      // Ici on pourrait envoyer l'erreur à un service de monitoring
      console.error('Erreur de page:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

// Composant spécialisé pour les erreurs de composants
export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => (
  <ErrorBoundary
    fallback={fallback || (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700 text-sm">
            Erreur lors du chargement du composant
          </span>
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);
