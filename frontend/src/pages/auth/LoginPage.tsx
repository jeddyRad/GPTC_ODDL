import { LoginForm } from '@/components/auth';
import { AuthLayout } from '@/layouts';

export function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}
