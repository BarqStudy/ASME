import { notFound } from "next/navigation";
import { publicContent } from "@/lib/content";
import { Provider } from "@/components/provider";
import { Shell } from "@/components/shell";
import { PublicPage } from "@/components/public";
import type { Content } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  if (
    path.length &&
    ![
      "about",
      "events",
      "library",
      "projects",
      "competitions",
      "tools",
      "join",
      "auth",
      "portal",
      "admin",
      "careers",
      "media",
      "contact",
      "privacy",
      "search",
      "u",
      "verify",
    ].includes(path[0])
  )
    notFound();
  const content = JSON.parse(JSON.stringify(await publicContent())) as Content;
  return (
    <Provider initial={content}>
      <Shell>
        <PublicPage path={path} />
      </Shell>
    </Provider>
  );
}
