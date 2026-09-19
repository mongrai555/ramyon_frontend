import AdminTableClientPage from "./AdminTableClientPage";

interface PageProps {
  params: Promise<{ tableId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tableId } = await params;
  
  return <AdminTableClientPage tableId={tableId} />;
}
