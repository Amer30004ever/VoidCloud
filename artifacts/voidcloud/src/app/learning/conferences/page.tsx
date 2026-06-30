import { redirect } from "@/compat/next-navigation";

export default function ConferencesRedirectPage() {
  redirect('/learning?tab=conferences');
}
