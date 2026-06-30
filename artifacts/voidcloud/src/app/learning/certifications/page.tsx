import { redirect } from "@/compat/next-navigation";

export default function CertificationsRedirectPage() {
  redirect('/learning?tab=certifications');
}
