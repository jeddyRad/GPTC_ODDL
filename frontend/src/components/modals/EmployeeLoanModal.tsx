import React from 'react';
import { X, Save } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from '@/hooks/useForm';
import { useTranslation } from 'react-i18next';
import { Button } from '../common/Button';

interface EmployeeLoanModalProps {
  onClose: () => void;
}

interface EmployeeLoanFormData {
  employeeId: string;
  fromServiceId: string;
  toServiceId: string;
  startDate: string;
  endDate: string;
  reason: string;
  workloadImpact: number;
}

export function EmployeeLoanModal({ onClose }: EmployeeLoanModalProps) {
  const { services, createEmployeeLoan } = useData();
  const { user } = useAuth();
  const { t } = useTranslation();

  const initialValues: EmployeeLoanFormData = {
    employeeId: user?.id || '',
    fromServiceId: user?.service || '',
    toServiceId: '',
    startDate: '',
    endDate: '',
    reason: '',
    workloadImpact: 50,
  };

  const validationRules = {
    toServiceId: [
      {
        validator: (value: any) => value !== '',
        message: 'Veuillez sélectionner un département de destination',
      },
      {
        validator: (value: any, formValues: any) => value !== formValues.fromServiceId,
        message: 'Le département de destination doit être différent du département source',
      },
    ],
    startDate: [
      {
        validator: (value: any) => value !== '',
        message: 'La date de début est requise',
      },
      {
        validator: (value: any) => new Date(value) >= new Date(),
        message: 'La date de début doit être ultérieure à aujourd\'hui',
      },
    ],
    endDate: [
      {
        validator: (value: any) => value !== '',
        message: 'La date de fin est requise',
      },
      {
        validator: (value: any, formValues: any) => 
          value !== '' && formValues.startDate !== '' && 
          new Date(value) > new Date(formValues.startDate),
        message: 'La date de fin doit être ultérieure à la date de début',
      },
    ],
    reason: [
      {
        validator: (value: any) => value.length >= 10,
        message: 'La raison doit contenir au moins 10 caractères',
      },
    ],
    workloadImpact: [
      {
        validator: (value: any) => Number(value) >= 0 && Number(value) <= 100,
        message: 'L\'impact sur la charge de travail doit être entre 0 et 100%',
      },
    ],
  };

  const handleFormSubmit = async (values: EmployeeLoanFormData) => {
    try {
      await createEmployeeLoan({
        ...values,
        startDate: new Date(values.startDate),
        endDate: new Date(values.endDate),
        status: 'pending',
      });
      onClose();
    } catch (error) {
      console.error('Error submitting employee loan:', error);
      throw new Error('Une erreur est survenue lors de la création du prêt');
    }
  };

  const { 
    values, 
    errors, 
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    isSubmitting 
  } = useForm({
    initialValues,
    validationRules,
    onSubmit: handleFormSubmit,
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === 'Enter' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
            const form = e.currentTarget.querySelector('form');
            if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Demande de Prêt d'Employé</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isSubmitting}
            title={t('common.close')}
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" id="fromServiceLabel">
                Département Source
              </label>
              <select
                name="fromServiceId"
                value={values.fromServiceId}
                onChange={handleChange}
                onBlur={() => handleBlur('fromServiceId')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  touched.fromServiceId && errors.fromServiceId
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isSubmitting}
                required
                aria-labelledby="fromServiceLabel"
                title={t('employeeLoan.fromService')}
              >
                {services.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              {touched.fromServiceId && errors.fromServiceId && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.fromServiceId}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" id="toServiceLabel">
                Département Destination *
              </label>
              <select
                name="toServiceId"
                value={values.toServiceId}
                onChange={handleChange}
                onBlur={() => handleBlur('toServiceId')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  touched.toServiceId && errors.toServiceId
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isSubmitting}
                required
                aria-labelledby="toServiceLabel"
                title={t('employeeLoan.toService')}
              >
                <option value="">{t('employeeLoan.selectDestination')}</option>
                {services.filter(dept => dept.id !== values.fromServiceId).map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              {touched.toServiceId && errors.toServiceId && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.toServiceId}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" id="startDateLabel">
                Date de Début *
              </label>
              <input
                type="date"
                name="startDate"
                value={values.startDate}
                onChange={handleChange}
                onBlur={() => handleBlur('startDate')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  touched.startDate && errors.startDate
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isSubmitting}
                required
                aria-labelledby="startDateLabel"
                title={t('employeeLoan.startDate')}
              />
              {touched.startDate && errors.startDate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.startDate}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" id="endDateLabel">
                Date de Fin *
              </label>
              <input
                type="date"
                name="endDate"
                value={values.endDate}
                onChange={handleChange}
                onBlur={() => handleBlur('endDate')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  touched.endDate && errors.endDate
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isSubmitting}
                required
                aria-labelledby="endDateLabel"
                title={t('employeeLoan.endDate')}
              />
              {touched.endDate && errors.endDate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.endDate}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" id="reasonLabel">
              Raison du Prêt *
            </label>
            <textarea
              name="reason"
              value={values.reason}
              onChange={handleChange}
              onBlur={() => handleBlur('reason')}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[100px] ${
                touched.reason && errors.reason
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder={t('employeeLoan.reasonPlaceholder')}
              disabled={isSubmitting}
              required
              aria-labelledby="reasonLabel"
              title={t('employeeLoan.reason')}
            />
            {touched.reason && errors.reason && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.reason}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" id="workloadImpactLabel">
              Impact sur la Charge de Travail: {values.workloadImpact}%
            </label>
            <input
              type="range"
              name="workloadImpact"
              min="0"
              max="100"
              step="10"
              value={values.workloadImpact}
              onChange={handleChange}
              onBlur={() => handleBlur('workloadImpact')}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              disabled={isSubmitting}
              aria-labelledby="workloadImpactLabel"
              title={t('employeeLoan.workloadImpact')}
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>{t('employeeLoan.noImpact')}</span>
              <span>{t('employeeLoan.totalImpact')}</span>
            </div>
            {touched.workloadImpact && errors.workloadImpact && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.workloadImpact}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={onClose}
              variant="ghost"
              leftIcon={<X />}
              disabled={isSubmitting}
              title={t('common.cancel')}
              aria-label={t('common.cancel')}
            >
              <X className="w-4 h-4" aria-hidden="true" />
              <span>{t('common.cancel')}</span>
            </Button>
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Save />}
              disabled={isSubmitting}
              title={t('employeeLoan.create')}
              aria-label={t('employeeLoan.create')}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">◌</span>
                  <span>{t('employeeLoan.creating')}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" aria-hidden="true" />
                  <span>{t('employeeLoan.create')}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
