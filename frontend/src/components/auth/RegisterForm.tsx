import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Loader2, Mail, Lock, AlertCircle, Building2, User, Shield, Users, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import serviceService from '@/services/serviceService';
import { Service } from '@/types'; // Utilisation de l'interface Service du frontend
import { registerServiceManager } from '@/services/serviceService';
import { getPublicServices } from '@/services/serviceService';
import oddlLogo from '../../assets/oddl.png';

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  service_id?: string;
  admin_code?: string;
}

interface RegisterServiceManagerFormData {
  serviceName: string;
  serviceDescription: string;
  serviceColor: string;
  managerUsername: string;
  managerEmail: string;
  managerPassword: string;
  managerFirstName: string;
  managerLastName: string;
  adminCode: string;
}

export function RegisterForm() {
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'EMPLOYEE',
    service_id: '',
    admin_code: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [createNewService, setCreateNewService] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  // Champs pour la création atomique service+manager
  const [serviceData, setServiceData] = useState({
    serviceName: '',
    serviceDescription: '',
    serviceColor: '#3788d8'
  });

  useEffect(() => {
    if (formData.role === 'MANAGER' && !createNewService) {
        setIsLoadingServices(true);
      getPublicServices().then(setServices).finally(() => setIsLoadingServices(false));
    }
  }, [formData.role, createNewService]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'service_id') {
      setFormData(prev => ({ ...prev, service_id: value }));
    } else if (name.startsWith('service')) {
      setServiceData(prev => ({ ...prev, [name.replace('service', 'service')]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      if (formData.role === 'MANAGER' && createNewService) {
        // Création atomique service+manager
        await registerServiceManager({
          serviceName: serviceData.serviceName,
          serviceDescription: serviceData.serviceDescription,
          serviceColor: serviceData.serviceColor,
          managerUsername: formData.username,
          managerEmail: formData.email,
          managerPassword: formData.password,
          managerFirstName: formData.firstName,
          managerLastName: formData.lastName,
          adminCode: formData.admin_code || ''
        });
        setSuccess('Service et manager créés avec succès ! Vous pouvez maintenant vous connecter.');
        setTimeout(() => navigate('/login', { state: { message: 'Inscription réussie !' } }), 2000);
      } else {
        // Inscription classique
      const response = await register({
        ...formData,
        first_name: formData.firstName,
        last_name: formData.lastName,
      });
      if (!response.success) {
        setError(response.error || 'Une erreur est survenue lors de l\'inscription.');
      } else {
          setSuccess('Inscription réussie ! Vous pouvez maintenant vous connecter.');
          setTimeout(() => navigate('/login', { state: { message: 'Inscription réussie !' } }), 2000);
        }
      }
    } catch (err: any) {
      setError(err?.service_name || err?.manager_username || err?.manager_email || err?.admin_code || err?.service_id || err?.username || err?.email || err?.password || 'Erreur lors de la création.');
    } finally {
      setIsLoading(false);
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
      <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-xl animate-fade-in">
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prénom</label>
              <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom</label>
              <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Adresse email</label>
              <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom d'utilisateur</label>
              <input type="text" name="username" required value={formData.username} onChange={handleChange} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mot de passe</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} name="password" required value={formData.password} onChange={handleChange} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white pr-10" />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rôle</label>
              <select name="role" value={formData.role} onChange={e => { setFormData(prev => ({ ...prev, role: e.target.value as any })); setCreateNewService(false); }} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white">
                <option value="EMPLOYEE">Employé</option>
                <option value="MANAGER">Chef de service</option>
                <option value="ADMIN">Administrateur</option>
              </select>
            </div>
          </div>
          {/* ADMIN : code admin obligatoire */}
          {formData.role === 'ADMIN' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Code administrateur</label>
              <div className="relative">
                <input type={showAdminCode ? 'text' : 'password'} name="admin_code" required value={formData.admin_code || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white pr-10" />
                <button type="button" onClick={() => setShowAdminCode(p => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                  {showAdminCode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Ce code est requis pour créer un administrateur.</p>
            </div>
          )}
          {/* MANAGER : choix création service ou rattachement */}
          {formData.role === 'MANAGER' && (
            <div className="md:col-span-2 space-y-2">
              <label className="flex items-center cursor-pointer">
                <span className="mr-3 text-sm font-medium text-gray-700 dark:text-gray-300">Créer un nouveau service</span>
                <span className="relative">
                  <input
                    type="checkbox"
                    checked={createNewService}
                    onChange={e => setCreateNewService(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 dark:bg-gray-700 rounded-full peer peer-checked:bg-blue-600 transition-colors duration-200"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 peer-checked:translate-x-5"></div>
                </span>
              </label>
              {createNewService ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom du service</label>
                    <input type="text" name="serviceName" required value={serviceData.serviceName} onChange={handleChange} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description du service</label>
                    <textarea name="serviceDescription" value={serviceData.serviceDescription} onChange={handleChange} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Couleur du service</label>
                    <input type="color" name="serviceColor" value={serviceData.serviceColor} onChange={handleChange} className="w-12 h-8 p-0 border-none bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Code administrateur</label>
                    <div className="relative">
                      <input type={showAdminCode ? 'text' : 'password'} name="admin_code" required value={formData.admin_code || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white pr-10" />
                      <button type="button" onClick={() => setShowAdminCode(p => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                        {showAdminCode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Ce code est requis pour créer un manager et un service.</p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sélectionner un service existant</label>
                  {isLoadingServices ? (
                    <div>Chargement des services...</div>
                  ) : (
                    <select name="service_id" required value={formData.service_id} onChange={handleChange} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white">
                      <option value="">-- Choisir un service --</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  )}
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Code administrateur</label>
                    <div className="relative">
                      <input type={showAdminCode ? 'text' : 'password'} name="admin_code" required value={formData.admin_code || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white pr-10" />
                      <button type="button" onClick={() => setShowAdminCode(p => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                        {showAdminCode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Ce code est requis pour créer un manager.</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <button type="submit" disabled={isLoading} className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow flex items-center justify-center gap-2">
            {isLoading && <Loader2 className="animate-spin h-5 w-5" />} Créer le compte
          </button>
        </form>
        {/* Lien vers la page de login */}
        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
            Déjà un compte ? Se connecter
          </Link>
        </div>
      </div>
    </>
  );
}
