import { redirect } from "next/navigation";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Projects — Review Scout" };

type Row = {
  id: string;
  name: string;
  niche: string | null;
  updated_at: string;
  project_apps: { count: number }[];
  reviews: { count: number }[];
  analyses: { count: number }[];
  prompts: { count: number }[];
};

const count = (a?: { count: number }[]) => a?.[0]?.count ?? 0;

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function ProjectsPage() {
  if (!isSupabaseConfigured) {
    return (
      <main className="min-h-screen">
        <AppNav />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-xl font-bold text-slate-900">Backend not configured</h1>
          <p className="mt-2 text-sm text-slate-500">
            Set <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable Projects.
          </p>
        </div>
      </main>
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/projects");

  const { data } = await supabase
    .from("projects")
    .select("id,name,niche,updated_at, project_apps(count), reviews(count), analyses(count), prompts(count)")
    .order("updated_at", { ascending: false });
  const projects = (data ?? []) as Row[];

  return (
    <main className="min-h-screen">
      <AppNav email={user.email} />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Projects</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Each project is a niche: a target app + its competitors, all their reviews, the Love / Want / Don&apos;t-Need
              analysis, and the generated iOS build spec.
            </p>
          </div>
          <Link
            href="/projects/new"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            New project
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <p className="text-slate-500">No projects yet.</p>
            <Link
              href="/projects/new"
              className="mt-3 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Create your first project
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h2 className="truncate text-base font-semibold text-slate-900">{p.name}</h2>
                  <span className="shrink-0 text-xs text-slate-400">{timeAgo(p.updated_at)}</span>
                </div>
                {p.niche && <p className="mt-0.5 truncate text-xs text-slate-500">{p.niche}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                    {count(p.project_apps)} app{count(p.project_apps) === 1 ? "" : "s"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                    {count(p.reviews).toLocaleString()} reviews
                  </span>
                  {count(p.analyses) > 0 && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">Analyzed</span>
                  )}
                  {count(p.prompts) > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">Spec ready</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
