import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '@/services/api';
import { User } from '@/types';
import { hasToken, removeToken, isTokenExpired, setToken } from '@/utils/auth';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
    refreshUser: () => Promise<void>;
    uploadProfilePhoto: (file: File) => Promise<void>;
    deleteProfilePhoto: () => Promise<void>;
}

interface RegisterData {
    username: string;
    password: string;
    email: string;
    firstName: string;
    lastName: string;
    first_name: string;
    last_name: string;
    role?: string;
    service_id?: string;
    admin_code?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth doit être utilisé dans un AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                if (hasToken() && !isTokenExpired()) {
                    await fetchUserProfile();
                } else {
                    if (isTokenExpired()) {
                        removeToken();
                    }
                }
            } catch (error) {
                console.error('Erreur lors de l\'initialisation de l\'authentification:', error);
                removeToken();
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const userData = await apiService.getMe();
            // Adapter la transformation pour coller à la réponse backend
            const transformedUser = {
                id: userData.id?.toString() || '',
                username: userData.username || '',
                email: userData.email || '',
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                role: userData.role || 'EMPLOYEE',
                service: userData.service || (userData as any).service_id || (userData as any).serviceId || null,
                serviceDetails: userData.serviceDetails || undefined,
                permissions: userData.permissions || [],
                profilePhoto: userData.profilePhoto || undefined,
                phone: userData.phone || undefined,
                bio: userData.bio || undefined,
            };
            setUser(transformedUser);
            return transformedUser;
        } catch (error) {
            console.error('Erreur lors de la récupération du profil:', error);
            removeToken();
            throw error;
        }
    };

    const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await apiService.login(username, password);
            const { access: token, refresh: refreshToken } = response;
            setToken(token, refreshToken);
            await fetchUserProfile();
            return { success: true };
        } catch (error: any) {
            console.error('Erreur de connexion:', error);
            const errorMessage = error.response?.data?.detail || 'Erreur lors de la connexion';
            return { 
                success: false, 
                error: errorMessage
            };
        }
    };

    const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
        try {
            const registerData = {
                username: userData.username,
                email: userData.email,
                password: userData.password,
                first_name: userData.first_name,
                last_name: userData.last_name,
                role: userData.role || 'EMPLOYEE',
                service_id: userData.service_id,
                admin_code: userData.admin_code,
            };
            await apiService.register(registerData);
            return { success: true };
        } catch (error: any) {
            console.error('Erreur d\'inscription:', error);
            const errorMessage = error.response?.data?.detail || 
                                error.response?.data?.message || 
                                'Erreur lors de l\'inscription';
            return { 
                success: false, 
                error: errorMessage 
            };
        }
    };

    const logout = () => {
        removeToken();
        setUser(null);
    };

    const refreshUser = async () => {
        await fetchUserProfile();
    };

    const uploadProfilePhoto = async (file: File) => {
        try {
            const response = await apiService.uploadProfilePhoto(file);
            setUser(prev => prev ? { ...prev, profilePhoto: response.photoUrl } : null);
        } catch (error) {
            console.error('Erreur lors de l\'upload de la photo de profil:', error);
            throw error;
        }
    };

    const deleteProfilePhoto = async () => {
        try {
            // Suppression côté backend à implémenter si besoin
            setUser(prev => prev ? { ...prev, profilePhoto: undefined } : null);
        } catch (error) {
            console.error('Erreur lors de la suppression de la photo de profil:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            isLoading,
            login,
            logout,
            register,
            refreshUser,
            uploadProfilePhoto,
            deleteProfilePhoto
        }}>
            {children}
        </AuthContext.Provider>
    );
};