import TableClientPage from "./TableClientPage";

interface PageProps {
  params: Promise<{ tableId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tableId } = await params;
  
  return <TableClientPage tableId={tableId} />;
}
