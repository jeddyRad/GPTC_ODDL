import React from 'react';
import { AlertTriangle, X, RefreshCw, Info, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type ErrorType = 'error' | 'warning' | 'info' | 'success';

interface ErrorDisplayProps {
  type?: ErrorType;
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDismiss?: boolean;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  type = 'error',
  title,
  message,
  details,
  onRetry,
  onDismiss,
  showDismiss = true,
  className = ''
}) => {
  const { t } = useTranslation();
  const typeConfig = {
    error: {
      icon: AlertTriangle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-500'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-500'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-500'
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      iconColor: 'text-green-500'
    }
  };

  const config = typeConfig[type];
  const IconComponent = config.icon;

  return (
    <div className={`border rounded-lg p-4 ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className="flex items-start">
        <IconComponent className={`w-5 h-5 ${config.iconColor} mt-0.5 mr-3 flex-shrink-0`} />
        
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`text-sm font-medium ${config.textColor} mb-1`}>
              {title}
            </h3>
          )}
          
          <p className={`text-sm ${config.textColor}`}>
            {message}
          </p>
          
          {details && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                {t('common.seeDetails')}
              </summary>
              <pre className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded border overflow-auto">
                {details}
              </pre>
            </details>
          )}
        </div>

        <div className="flex items-center space-x-2 ml-4">
          {onRetry && (
            <button
              onClick={onRetry}
              className={`p-1 rounded hover:bg-white hover:bg-opacity-50 transition-colors ${config.textColor}`}
              title={t('common.retry')}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          
          {showDismiss && onDismiss && (
            <button
              onClick={onDismiss}
              className={`p-1 rounded hover:bg-white hover:bg-opacity-50 transition-colors ${config.textColor}`}
              title={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Composants spécialisés pour différents types d'erreurs
export const NetworkError: React.FC<{
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}> = ({ 
  message = "Erreur de connexion. Vérifiez votre connexion internet et réessayez.", 
  onRetry, 
  onDismiss 
}) => (
  <ErrorDisplay
    type="error"
    title="Erreur de connexion"
    message={message}
    onRetry={onRetry}
    onDismiss={onDismiss}
  />
);

export const ValidationError: React.FC<{
  message: string;
  details?: string;
  onDismiss?: () => void;
}> = ({ message, details, onDismiss }) => (
  <ErrorDisplay
    type="warning"
    title="Erreur de validation"
    message={message}
    details={details}
    onDismiss={onDismiss}
  />
);

export const PermissionError: React.FC<{
  message?: string;
  onDismiss?: () => void;
}> = ({ 
  message = "Vous n'avez pas les permissions nécessaires pour effectuer cette action.", 
  onDismiss 
}) => (
  <ErrorDisplay
    type="warning"
    title="Permission refusée"
    message={message}
    onDismiss={onDismiss}
  />
);

export const SuccessMessage: React.FC<{
  title?: string;
  message: string;
  onDismiss?: () => void;
}> = ({ title, message, onDismiss }) => (
  <ErrorDisplay
    type="success"
    title={title}
    message={message}
    onDismiss={onDismiss}
  />
);

export const InfoMessage: React.FC<{
  title?: string;
  message: string;
  details?: string;
  onDismiss?: () => void;
}> = ({ title, message, details, onDismiss }) => (
  <ErrorDisplay
    type="info"
    title={title}
    message={message}
    details={details}
    onDismiss={onDismiss}
  />
);