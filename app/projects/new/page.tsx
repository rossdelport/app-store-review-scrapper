import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import NewProjectForm from "@/components/projects/NewProjectForm";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "New project — Review Scout" };

export default async function NewProjectPage() {
  if (!isSupabaseConfigured) redirect("/projects");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/projects/new");

  return (
    <main className="min-h-screen">
      <AppNav email={user.email} />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">New project</h1>
        <p className="mt-1 text-sm text-slate-500">
          Name the niche, then search and pick the target app plus its competitors. You&apos;ll pull reviews into the
          project next.
        </p>
        <div className="mt-6">
          <NewProjectForm />
        </div>
      </section>
    </main>
  );
}
