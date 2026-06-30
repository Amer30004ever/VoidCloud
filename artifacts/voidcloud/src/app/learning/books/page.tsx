import { redirect } from "@/compat/next-navigation";

export default function BooksRedirectPage() {
  redirect('/learning?tab=books');
}
