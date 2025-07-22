import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  text,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    white: 'text-white',
    gray: 'text-gray-400'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${sizeClasses[size]} ${colorClasses[color]}`} />
      {text && (
        <p className="mt-2 text-sm text-gray-600 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};

// Composants spécialisés pour différents cas d'usage
export const PageLoadingSpinner: React.FC<{ text?: string }> = ({ text = 'Chargement en cours...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <LoadingSpinner size="xl" text={text} />
  </div>
);

export const ButtonLoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'sm' }) => (
  <LoadingSpinner size={size} color="white" />
);

export const TableLoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center py-8">
    <LoadingSpinner size="lg" text="Chargement des données..." />
  </div>
);

export const ModalLoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <LoadingSpinner size="lg" text="Traitement en cours..." />
  </div>
);
