import { cookies } from 'next/headers';
import LoginForm from './LoginForm';
import Dashboard from './Dashboard';

export default async function Home() {
  const cookieStore = await cookies();
  const authed = cookieStore.get('auth')?.value === 'valid';
  return authed ? <Dashboard /> : <LoginForm />;
}
