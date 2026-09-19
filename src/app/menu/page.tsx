"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function Waiting({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-6">
      <div className="flex flex-col items-center gap-3 text-ink-soft">
        <span className="spinner h-8 w-8 text-primary" />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}

function MenuRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableId = searchParams.get("tableId");

  useEffect(() => {
    if (tableId) {
      router.replace(`/table/${tableId}`);
    } else {
      router.replace("/");
    }
  }, [tableId, router]);

  return <Waiting label="กำลังเปิดเมนูของโต๊ะคุณ" />;
}

export default function MenuRedirectPage() {
  return (
    <Suspense fallback={<Waiting label="กำลังเปิดเมนู" />}>
      <MenuRedirect />
    </Suspense>
  );
}
