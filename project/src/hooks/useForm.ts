import { useState, useCallback } from 'react';

export interface ValidationRule {
  validator: (value: any, formValues?: any) => boolean;
  message: string;
}

export interface ValidationRules {
  [key: string]: ValidationRule[];
}

interface UseFormProps<T> {
  initialValues: T;
  validationRules?: ValidationRules;
  onSubmit: (values: T) => Promise<void>;
}

export function useForm<T extends { [key: string]: any }>({
  initialValues,
  validationRules = {},
  onSubmit,
}: UseFormProps<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback(
    (name: keyof T, value: any) => {
      const fieldRules = validationRules[name as string];
      if (!fieldRules) return '';

      for (const rule of fieldRules) {
        if (!rule.validator(value, values)) {
          return rule.message;
        }
      }
      return '';
    },
    [validationRules, values]
  );

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
      const { name, value, type } = e.target;
      const finalValue =
        type === 'number' || type === 'range' ? Number(value) : value;

      setValues((prev) => ({ ...prev, [name]: finalValue }));

      const error = validateField(name as keyof T, finalValue);
      setErrors((prev) => ({ ...prev, [name]: error }));
    },
    [validateField]
  );

  const handleBlur = useCallback(
    (name: keyof T) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      const error = validateField(name, values[name]);
      setErrors((prev) => ({ ...prev, [name]: error }));
    },
    [validateField, values]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Marquer tous les champs comme touchés
      const allTouched = Object.keys(values).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {}
      );
      setTouched(allTouched);

      // Valider tous les champs
      let hasErrors = false;
      const newErrors: Partial<Record<keyof T, string>> = {};

      for (const key in values) {
        const error = validateField(key as keyof T, values[key]);
        if (error) {
          hasErrors = true;
          newErrors[key as keyof T] = error;
        }
      }

      if (hasErrors) {
        setErrors(newErrors);
        return;
      }

      // Soumission du formulaire
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch (error) {
        // Gérer l'erreur si nécessaire
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateField, onSubmit]
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
  };
}
