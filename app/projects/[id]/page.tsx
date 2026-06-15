import { notFound, redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import ProjectDetail from "@/components/projects/ProjectDetail";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { AnalysisRow, Project, ProjectApp } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  if (!isSupabaseConfigured) redirect("/projects");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/projects/${params.id}`);

  const { data: project } = await supabase.from("projects").select("*").eq("id", params.id).single();
  if (!project) notFound();

  const [{ data: apps }, reviewCountRes, { data: analysisRows }, { data: promptRows }] = await Promise.all([
    supabase.from("project_apps").select("*").eq("project_id", params.id).order("is_target", { ascending: false }),
    supabase.from("reviews").select("*", { count: "exact", head: true }).eq("project_id", params.id),
    supabase.from("analyses").select("*").eq("project_id", params.id).order("created_at", { ascending: false }).limit(1),
    supabase.from("prompts").select("content").eq("project_id", params.id).order("created_at", { ascending: false }).limit(1),
  ]);

  return (
    <main className="min-h-screen">
      <AppNav email={user.email} />
      <ProjectDetail
        project={project as Project}
        apps={(apps ?? []) as ProjectApp[]}
        initialReviewCount={reviewCountRes.count ?? 0}
        initialAnalysis={(analysisRows?.[0] as AnalysisRow | undefined) ?? null}
        initialPrompt={promptRows?.[0]?.content ?? null}
      />
    </main>
  );
}
