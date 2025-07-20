import { useState } from 'react';
import { LogIn, Mail, Lock, AlertCircle, Building2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button, LoadingSpinner } from '@/components/common';
import oddlLogo from '../../assets/oddl.png';
export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await login(username, password);
      
      if (!response.success) {
        setError(response.error || 'Nom d\'utilisateur ou mot de passe incorrect.');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Une erreur est survenue lors de la connexion. Veuillez réessayer.');
      console.error('Login error:', err);
    }
  };

  return (
    <>
      <div className="text-center animate-fade-in">
        {/* Logo personnalisé de l'application */}
        {/* Logo harmonisé et agrandi */}
        <div className="mx-auto h-32 w-32 bg-gradient-to-b from-white to-black-600 rounded-full flex items-center justify-center mb-6 shadow-2xl">
          <img
            src={oddlLogo}
            alt="Logo GPTC ODDL"
            className="w-28 h-28 object-contain"
          />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">GPTC ODDL</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Observatoire du Développement Local</p>
        <p className="text-sm text-gray-500 dark:text-gray-500">Plateforme de gestion collaborative</p>
      </div>

      <div className="max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 animate-slide-in border border-gray-200 dark:border-gray-700 mx-auto mt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nom d'utilisateur ou email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Nom d'utilisateur ou email"
                  required
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Votre mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            leftIcon={!isLoading && <LogIn className="w-5 h-5" />}
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/register" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
            Pas de compte ? S'inscrire
          </Link>
        </div>
      </div>

      <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
        <p>© 2024 ODDL - Observatoire du Développement Local</p>
        <p>Plateforme sécurisée de gestion collaborative</p>
      </div>
    </>
  );
}
