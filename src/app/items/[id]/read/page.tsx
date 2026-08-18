import { redirect } from "next/navigation";

export default async function ItemReadRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/library/${id}/read`);
}
