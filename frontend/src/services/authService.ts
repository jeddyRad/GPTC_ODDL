import apiService from '@/services/api';
import { User } from '@/types';

const { api } = apiService;

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface RegisterData {
    username: string;
    password: string;
    email: string;
    firstName: string;
    lastName: string;
    first_name: string; // Pour compatibilité avec le backend
    last_name: string;  // Pour compatibilité avec le backend
    service?: string;
    role?: string;
    adminCode?: string;
    serviceId?: string;
}

export interface AuthResponse {
    success: boolean;
    token?: string;
    user?: User;
    error?: string;
}

import { getToken, setToken, removeToken, hasToken } from '@/utils/auth';

class AuthService {
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        try {
            // Obtenir le token
            const tokenResponse = await api.post<{ access: string }>('/api/token/', credentials);
            const token = tokenResponse.data.access;
            
            // Sauvegarder le token
            setToken(token);
            
            // Obtenir le profil utilisateur
            const userResponse = await this.getCurrentUser();
            
            return {
                success: true,
                token,
                user: userResponse.data
            };
        } catch (error: any) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.response?.data?.detail || 'Erreur de connexion'
            };
        }
    }

    async register(data: RegisterData): Promise<AuthResponse> {
        try {
            await api.post('/api/register/', {
                ...data,
                // Assurer la compatibilité avec le backend
                first_name: data.firstName || data.first_name,
                last_name: data.lastName || data.last_name
            });
            return { 
                success: true 
            };
        } catch (error: any) {
            console.error('Register error:', error);
            return { 
                success: false, 
                error: error.response?.data?.detail || error.response?.data?.message || 'Erreur lors de l\'inscription' 
            };
        }
    }

    async getCurrentUser() {
        try {
            return await api.get<User>('/api/users/me/');
        } catch (error) {
            console.error('Get current user error:', error);
            throw error;
        }
    }

    logout(): void {
        removeToken();
    }

    getToken(): string | null {
        return getToken();
    }

    isAuthenticated(): boolean {
        return hasToken();
    }
}

export const authService = new AuthService();
