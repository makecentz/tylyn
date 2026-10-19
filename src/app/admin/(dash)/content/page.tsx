import { getAllContent } from "@/lib/content";
import { PageTitle } from "../admin-ui";
import { ContentEditor } from "./ContentEditor";
import Link from "next/link";

export default async function ContentPage() {
  const content = await getAllContent();
  return (
    <>
      <PageTitle actions={<Link href="/" target="_blank" className="btn btn-outline min-h-11">View site</Link>}>Site content</PageTitle>
      <ContentEditor initial={content} />
    </>
  );
}
