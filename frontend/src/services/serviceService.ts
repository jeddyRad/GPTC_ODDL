import apiService from '@/services/api';
import { Service as FrontendService } from '@/types';

// Get the API instance from apiService
const { api } = apiService;

export const getServices = async (): Promise<FrontendService[]> => {
  try {
    const response = await api.get<FrontendService[]>('/services/');
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des services:', error);
    return [];
  }
};

export const getPublicServices = async (): Promise<FrontendService[]> => {
  try {
    const response = await api.get<FrontendService[]>('/api/public-services/', { headers: { Authorization: undefined } });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des services publics:', error);
    return [];
  }
};

export const registerServiceManager = async (data: {
  serviceName: string;
  serviceDescription?: string;
  serviceColor?: string;
  managerUsername: string;
  managerEmail: string;
  managerPassword: string;
  managerFirstName: string;
  managerLastName: string;
  adminCode: string;
}): Promise<{ serviceId: string; managerId: string; managerUsername: string; serviceName: string }> => {
  try {
    const response = await api.post('/api/register-service-manager/', {
      service_name: data.serviceName,
      service_description: data.serviceDescription,
      service_color: data.serviceColor,
      manager_username: data.managerUsername,
      manager_email: data.managerEmail,
      manager_password: data.managerPassword,
      manager_first_name: data.managerFirstName,
      manager_last_name: data.managerLastName,
      admin_code: data.adminCode
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export default {
  getServices,
  getPublicServices,
  registerServiceManager
};
