import { useState, useEffect } from 'react';
import { UserPlus, Mail, Lock, User, Building2, Shield, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import serviceService from '@/services/serviceService';
import { Service } from '@/types';
import { registerServiceManager } from '@/services/serviceService';
import { getPublicServices } from '@/services/serviceService';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/common/Button';
import { ProgressSteps } from '@/components/common/ProgressSteps';
import oddlLogo from '../../assets/oddl.png';

const REGISTRATION_STEPS = [
  { id: 'info', title: 'Informations', description: 'Données personnelles' },
  { id: 'role', title: 'Rôle', description: 'Type de compte' },
  { id: 'service', title: 'Service', description: 'Organisation' },
  { id: 'confirm', title: 'Confirmation', description: 'Vérification' }
];

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN';
  serviceId?: string;
  serviceName?: string;
  serviceDescription?: string;
  serviceColor?: string;
  adminCode?: string;
}

export function RegisterForm() {
  const [currentStep, setCurrentStep] = useState('info');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    role: 'EMPLOYEE'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [createNewService, setCreateNewService] = useState(false);
  const [services, setServices] = useState<Service[]>([]);

  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateStep = (step: string): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (step) {
      case 'info':
        if (!formData.firstName.trim()) newErrors.firstName = 'Le prénom est requis';
        if (!formData.lastName.trim()) newErrors.lastName = 'Le nom est requis';
        if (!formData.email.trim()) {
          newErrors.email = 'L\'email est requis';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'L\'email n\'est pas valide';
        }
        if (!formData.username.trim()) {
          newErrors.username = 'Le nom d\'utilisateur est requis';
        } else if (formData.username.length < 3) {
          newErrors.username = 'Le nom d\'utilisateur doit contenir au moins 3 caractères';
        }
        if (!formData.password.trim()) {
          newErrors.password = 'Le mot de passe est requis';
        } else if (formData.password.length < 8) {
          newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
        }
        break;
      
      case 'role':
        if (!formData.role) newErrors.role = 'Veuillez sélectionner un rôle';
        break;
        
      case 'service':
        if (formData.role === 'MANAGER') {
          if (createNewService) {
            if (!formData.serviceName?.trim()) newErrors.serviceName = 'Le nom du service est requis';
            if (!formData.adminCode?.trim()) newErrors.adminCode = 'Le code administrateur est requis';
          } else {
            if (!formData.serviceId) newErrors.serviceId = 'Veuillez sélectionner un service';
            if (!formData.adminCode?.trim()) newErrors.adminCode = 'Le code administrateur est requis';
          }
        }
        if (formData.role === 'ADMIN') {
          if (!formData.adminCode?.trim()) newErrors.adminCode = 'Le code administrateur est requis';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;
    
    const currentIndex = REGISTRATION_STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex < REGISTRATION_STEPS.length - 1) {
      setCompletedSteps(prev => [...prev, currentStep]);
      setCurrentStep(REGISTRATION_STEPS[currentIndex + 1].id);
    }
  };

  const prevStep = () => {
    const currentIndex = REGISTRATION_STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(REGISTRATION_STEPS[currentIndex - 1].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep('confirm')) return;
    
    setIsLoading(true);
    
    try {
      if (formData.role === 'MANAGER' && createNewService) {
        await registerServiceManager({
          serviceName: formData.serviceName!,
          serviceDescription: formData.serviceDescription || '',
          serviceColor: formData.serviceColor || '#3788d8',
          managerUsername: formData.username,
          managerEmail: formData.email,
          managerPassword: formData.password,
          managerFirstName: formData.firstName,
          managerLastName: formData.lastName,
          adminCode: formData.adminCode || ''
        });
      } else {
        const response = await register({
          ...formData,
          first_name: formData.firstName,
          last_name: formData.lastName,
          service_id: formData.serviceId,
          admin_code: formData.adminCode
        });
        
        if (!response.success) {
          setErrors({ general: response.error || 'Une erreur est survenue lors de l\'inscription.' });
          return;
        }
      }
      
      navigate('/login', { 
        state: { message: 'Inscription réussie ! Vous pouvez maintenant vous connecter.' }
      });
    } catch (error: any) {
      setErrors({ 
        general: error?.service_name || error?.manager_username || error?.manager_email || 
                error?.admin_code || error?.service_id || error?.username || error?.email || 
                error?.password || 'Erreur lors de la création.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load services when needed
  useEffect(() => {
    if (formData.role === 'MANAGER' && !createNewService) {
      getPublicServices().then(setServices);
    }
  }, [formData.role, createNewService]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'info':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Prénom"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                error={errors.firstName}
                required
                icon={<User className="h-5 w-5" />}
                autoComplete="given-name"
              />
              
              <FormField
                label="Nom"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                error={errors.lastName}
                required
                icon={<User className="h-5 w-5" />}
                autoComplete="family-name"
              />
            </div>

            <FormField
              label="Adresse email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
              icon={<Mail className="h-5 w-5" />}
              autoComplete="email"
            />

            <FormField
              label="Nom d'utilisateur"
              name="username"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              required
              icon={<User className="h-5 w-5" />}
              autoComplete="username"
            />

            <FormField
              label="Mot de passe"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
              icon={<Lock className="h-5 w-5" />}
              showPasswordToggle
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              autoComplete="new-password"
            />
          </div>
        );

      case 'role':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Sélectionnez votre rôle *
              </label>
              <div className="space-y-3">
                {[
                  { value: 'EMPLOYEE', label: 'Employé', description: 'Accès standard aux fonctionnalités', icon: User },
                  { value: 'MANAGER', label: 'Chef de service', description: 'Gestion d\'équipe et de service', icon: Building2 },
                  { value: 'ADMIN', label: 'Administrateur', description: 'Accès complet à la plateforme', icon: Shield }
                ].map((role) => {
                  const Icon = role.icon;
                  return (
                    <label key={role.value} className="flex items-start p-4 border border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                      <input
                        type="radio"
                        name="role"
                        value={role.value}
                        checked={formData.role === role.value}
                        onChange={handleChange}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center">
                          <Icon className="h-5 w-5 text-gray-500 group-hover:text-blue-600 mr-2 transition-colors" />
                          <span className="font-medium text-gray-900 dark:text-white">{role.label}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{role.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              {errors.role && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-2">{errors.role}</p>
              )}
            </div>
          </div>
        );

      case 'service':
        if (formData.role === 'EMPLOYEE') {
          return (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Configuration terminée</h3>
              <p className="text-gray-600 dark:text-gray-400">
                En tant qu'employé, vous serez assigné à un service par votre administrateur.
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {formData.role === 'MANAGER' && (
              <div>
                <label className="flex items-center cursor-pointer mb-4 group">
                  <input
                    type="checkbox"
                    checked={createNewService}
                    onChange={(e) => setCreateNewService(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    Créer un nouveau service
                  </span>
                </label>

                {createNewService ? (
                  <div className="space-y-4">
                    <FormField
                      label="Nom du service"
                      name="serviceName"
                      value={formData.serviceName || ''}
                      onChange={handleChange}
                      error={errors.serviceName}
                      required
                      icon={<Building2 className="h-5 w-5" />}
                    />
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description du service
                      </label>
                      <textarea
                        name="serviceDescription"
                        value={formData.serviceDescription || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                        rows={3}
                        placeholder="Décrivez les missions et objectifs du service"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Couleur du service
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          name="serviceColor"
                          value={formData.serviceColor || '#3788d8'}
                          onChange={handleChange}
                          className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Choisissez une couleur pour identifier votre service
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sélectionner un service existant *
                    </label>
                    <select
                      name="serviceId"
                      value={formData.serviceId || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">-- Choisir un service --</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                    {errors.serviceId && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.serviceId}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {(formData.role === 'ADMIN' || formData.role === 'MANAGER') && (
              <FormField
                label="Code administrateur"
                name="adminCode"
                type="password"
                value={formData.adminCode || ''}
                onChange={handleChange}
                error={errors.adminCode}
                required
                icon={<Shield className="h-5 w-5" />}
                showPasswordToggle
                showPassword={showAdminCode}
                onTogglePassword={() => setShowAdminCode(!showAdminCode)}
                placeholder="Code fourni par l'administrateur"
              />
            )}
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Confirmez vos informations
            </h3>
            
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Prénom</span>
                  <p className="font-medium text-gray-900 dark:text-white">{formData.firstName}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Nom</span>
                  <p className="font-medium text-gray-900 dark:text-white">{formData.lastName}</p>
                </div>
              </div>
              
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                <p className="font-medium text-gray-900 dark:text-white">{formData.email}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Nom d'utilisateur</span>
                <p className="font-medium text-gray-900 dark:text-white">{formData.username}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Rôle</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formData.role === 'EMPLOYEE' && 'Employé'}
                  {formData.role === 'MANAGER' && 'Chef de service'}
                  {formData.role === 'ADMIN' && 'Administrateur'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <input
                id="terms"
                type="checkbox"
                required
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400">
                J'accepte les{' '}
                <Link to="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
                  conditions d'utilisation
                </Link>
                {' '}et la{' '}
                <Link to="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                  politique de confidentialité
                </Link>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white-50 via-white to-white-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
        <div className="mx-auto h-20 w-20 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <img
              src={oddlLogo}
              alt="Logo GPTC ODDL"
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Créer un compte</h1>
          <p className="text-gray-600 dark:text-gray-400">Rejoignez la plateforme GPTC ODDL</p>
        </div>

        {/* Progress Steps */}
        <ProgressSteps 
          steps={REGISTRATION_STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
        />

        {/* Main Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 animate-slide-in">
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-shake" role="alert">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-red-800 dark:text-red-200 text-sm">{errors.general}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {renderStepContent()}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="ghost"
                onClick={prevStep}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                className={currentStep === 'info' ? 'invisible' : ''}
              >
                Précédent
              </Button>

              {currentStep === 'confirm' ? (
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  leftIcon={!isLoading ? <UserPlus className="h-5 w-5" /> : undefined}
                >
                  {isLoading ? 'Création en cours...' : 'Créer mon compte'}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  onClick={nextStep}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Suivant
                </Button>
              )}
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center border-t border-gray-200 dark:border-gray-700 pt-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Déjà un compte ?{' '}
              <Link 
                to="/login" 
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors focus:outline-none focus:underline"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}