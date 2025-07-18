import { Metadata } from 'next';
import { getPageTitle } from '@/lib/metadata';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = {
  title: getPageTitle('Reset Password'),
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
