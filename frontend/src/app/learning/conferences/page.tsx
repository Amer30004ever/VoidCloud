import { redirect } from 'next/navigation';

export default function ConferencesRedirectPage() {
  redirect('/learning?tab=conferences');
}
