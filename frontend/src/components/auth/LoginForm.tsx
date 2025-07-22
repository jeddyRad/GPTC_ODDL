import { useState, useEffect } from 'react';
import { LogIn, Mail, Lock, AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { FormField } from '@/components/common/FormField';
import oddlLogo from '../../assets/oddl.png';

export function LoginForm() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Show success message from registration
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message from location state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Auto-focus username field
  useEffect(() => {
    const usernameField = document.getElementById('field-username');
    if (usernameField) {
      usernameField.focus();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Le nom d\'utilisateur est requis';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Le nom d\'utilisateur doit contenir au moins 3 caractères';
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const response = await login(formData.username, formData.password);
      
      if (!response.success) {
        setErrors({ general: response.error || 'Nom d\'utilisateur ou mot de passe incorrect' });
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      setErrors({ general: 'Une erreur est survenue lors de la connexion' });
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white-50 via-white to-white-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
        <div className="mx-auto h-20 w-20 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <img
              src={oddlLogo}
              alt="Logo GPTC ODDL"
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">GPTC ODDL</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-1">Observatoire de la Décentralisation et du Développement Local</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">Plateforme de gestion collaborative</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl animate-fade-in">
            <p className="text-green-800 dark:text-green-200 text-sm text-center">
              {successMessage}
            </p>
          </div>
        )}

        {/* Main Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 animate-slide-in">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Connexion</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Accédez à votre espace de travail</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* General Error */}
            {errors.general && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-shake" role="alert">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-red-800 dark:text-red-200 text-sm">{errors.general}</p>
                </div>
              </div>
            )}

            {/* Username Field */}
            <FormField
              label="Nom d'utilisateur ou email"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              placeholder="votre@email.com ou nom_utilisateur"
              required
              icon={<Mail className="h-5 w-5" />}
              autoComplete="username"
            />

            {/* Password Field */}
            <FormField
              label="Mot de passe"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="Votre mot de passe"
              required
              icon={<Lock className="h-5 w-5" />}
              showPasswordToggle
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              autoComplete="current-password"
            />

            {/* Options */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                  Se souvenir de moi
                </span>
              </label>
              <Link 
                to="/forgot-password" 
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={!formData.username || !formData.password}
              leftIcon={!isLoading ? <LogIn className="h-5 w-5" /> : undefined}
              rightIcon={!isLoading ? <ArrowRight className="h-4 w-4" /> : undefined}
              className="w-full"
            >
              {isLoading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Pas encore de compte ?{' '}
              <Link 
                to="/register" 
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors focus:outline-none focus:underline"
              >
                Créer un compte
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
          <p>© 2024 ODDL - Observatoire du Développement Local</p>
          <p>Plateforme sécurisée de gestion collaborative</p>
        </div>
      </div>
    </div>
  );
}