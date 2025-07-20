import { RegisterForm } from '@/components/auth';
import { AuthLayout } from '@/layouts';

export function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
}
