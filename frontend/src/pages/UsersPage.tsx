import React from 'react';
import { useTranslation } from 'react-i18next';

// Page de gestion des utilisateurs (en construction)
export function UsersPage() {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('usersPage.title')}</h1>
      <p className="mt-4 text-gray-600 dark:text-gray-400">
        {t('usersPage.underConstruction')}
      </p>
    </div>
  );
}
