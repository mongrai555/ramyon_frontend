"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

interface CachedTable {
  id: string;
  number: string;
}

/**
 * The code drawn on the tent card. It is an illustration of the thing sitting
 * on the table, not a working code — the real one is printed per table.
 */
function QrGlyph({ className = "" }: { className?: string }) {
  const size = 21;
  const cells: React.ReactElement[] = [];

  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x > size - 9 && y < 8) || (x < 8 && y > size - 9);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inFinder(x, y)) continue;
      if ((x * 7 + y * 13 + x * y) % 5 < 2) {
        cells.push(
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
        );
      }
    }
  }

  const finder = (ox: number, oy: number) => (
    <g key={`f-${ox}-${oy}`}>
      <rect x={ox} y={oy} width="7" height="7" />
      <rect x={ox + 1} y={oy + 1} width="5" height="5" fill="#fff" />
      <rect x={ox + 2} y={oy + 2} width="3" height="3" />
    </g>
  );

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {cells}
      {finder(0, 0)}
      {finder(size - 7, 0)}
      {finder(0, size - 7)}
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const [cachedTables, setCachedTables] = useState<CachedTable[]>([]);
  const [manualTableId, setManualTableId] = useState("");
  const [checkingRedirect, setCheckingRedirect] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);

  const isDevOrAdmin = process.env.NODE_ENV === "development" || isAdmin;

  // Load cached tables and handle auto-redirect on client mount
  useEffect(() => {
    const activeTable = localStorage.getItem("k_active_table");
    const adminToken = sessionStorage.getItem("k_admin_token");

    const cached = localStorage.getItem("k_cached_tables");
    if (cached) {
      setCachedTables(JSON.parse(cached));
    }

    if (adminToken) {
      setIsAdmin(true);
      setCheckingRedirect(false);
    } else if (activeTable) {
      // Auto-redirect normal customers back to their active table
      router.push(`/table/${activeTable}`);
    } else {
      setCheckingRedirect(false);
    }
  }, [router]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTableId.trim()) return;
    router.push(`/table/${manualTableId.trim()}`);
  };

  if (checkingRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg">
        <div className="flex flex-col items-center gap-3 text-ink-soft">
          <span className="spinner h-8 w-8 text-primary" />
          <p className="text-sm">กำลังพาคุณกลับไปที่โต๊ะเดิม</p>
        </div>
      </div>
    );
  }

  const showStaffTools = isAdmin || showSimulation;

  return (
    <div className="flex min-h-screen flex-col bg-brand-bg">
      <div className="awning" />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* The table tent: the object this whole product hangs off */}
          <div className="overflow-hidden rounded-panel bg-primary-dark text-center shadow-[0_18px_40px_-24px_rgba(43,26,21,0.7)]">
            <div className="awning awning-hot" />

            <div className="px-6 pt-8 pb-7 sm:px-10">
              <p className="text-sm font-medium text-accent">라면 언니</p>
              <h1 className="font-display mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                รามยอนออนนี่
              </h1>
              <p className="mt-2.5 text-sm text-white/70">
                อาหารเกาหลีสไตล์ไทย · สั่งเองได้จากโต๊ะ
              </p>

              <div className="mt-7 flex items-center gap-5 rounded-tile bg-white p-4 text-left">
                <QrGlyph className="h-20 w-20 shrink-0 text-ink" />
                <div>
                  <p className="font-display text-lg font-semibold text-ink">
                    สแกนโค้ดบนโต๊ะ
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    เปิดกล้องมือถือส่องที่โค้ด เมนูของโต๊ะคุณจะเปิดขึ้นมาเอง
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* the back leaf of the tent card */}
          <div
            className="mx-auto h-4 w-[86%] bg-gradient-to-b from-[#8f1a15] to-transparent"
            style={{ clipPath: "polygon(0 0, 100% 0, 93% 100%, 7% 100%)" }}
          />

          <p className="mx-auto mt-6 max-w-sm text-center text-sm leading-relaxed text-ink-soft">
            ทุกโต๊ะมีโค้ดของตัวเอง สั่งเพิ่มกี่รอบก็ได้ระหว่างมื้อ
            แล้วจ่ายทีเดียวที่เคาน์เตอร์ตอนกลับ
          </p>

          {/* Staff way in, kept quiet — almost no one who lands here needs it */}
          {!showStaffTools && (
            <div className="mt-10 flex flex-col items-center gap-3 border-t border-edge pt-6">
              <Link
                href="/admin"
                className="btn btn-plain btn-sm"
                prefetch={false}
              >
                <Icon name="key" size={16} />
                เข้าสู่ระบบสำหรับพนักงาน
              </Link>

              {isDevOrAdmin && (
                <button
                  type="button"
                  onClick={() => setShowSimulation(true)}
                  className="text-xs text-ink-faint underline decoration-edge underline-offset-4 hover:text-ink"
                >
                  เปิดเครื่องมือทดสอบโต๊ะ
                </button>
              )}
            </div>
          )}

          {showStaffTools && (
            <section className="panel-sunk mt-10 flex flex-col gap-5 p-5">
              <div>
                <h2 className="font-display text-base font-semibold text-ink">
                  เครื่องมือสำหรับทีมงาน
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  เปิดหน้าโต๊ะของลูกค้าเพื่อดูสิ่งที่ลูกค้าเห็น
                  หรือไปที่หน้าควบคุมร้าน
                </p>
              </div>

              {cachedTables.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {cachedTables.map((t) => (
                    <Link
                      key={t.id}
                      href={`/table/${t.id}`}
                      className="btn btn-plain btn-sm font-display justify-center"
                    >
                      {t.number}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="rounded-tile border border-edge bg-white px-3.5 py-3 text-sm leading-relaxed text-ink-soft">
                  ยังไม่มีรายชื่อโต๊ะในเครื่องนี้
                  เข้าหน้าควบคุมร้านหนึ่งครั้งเพื่อดึงรายชื่อโต๊ะมาเก็บไว้
                </p>
              )}

              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={manualTableId}
                  onChange={(e) => setManualTableId(e.target.value)}
                  placeholder="วางรหัสโต๊ะ (Table ID)"
                  aria-label="รหัสโต๊ะ"
                  className="field"
                />
                <button type="submit" className="btn btn-ink btn-sm shrink-0">
                  เปิดโต๊ะ
                </button>
              </form>

              <Link
                href="/admin"
                className="btn btn-red w-full"
                prefetch={false}
              >
                ไปที่หน้าควบคุมร้าน
                <Icon name="forward" size={16} />
              </Link>

              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowSimulation(false)}
                  className="text-xs text-ink-faint underline decoration-edge underline-offset-4 hover:text-ink"
                >
                  ซ่อนเครื่องมือทดสอบ
                </button>
              )}
            </section>
          )}
        </div>
      </main>

      <footer className="border-t border-edge px-4 py-5 text-center text-xs text-ink-faint">
        รามยอนออนนี่ · อาหารเกาหลีสไตล์ไทย
      </footer>
    </div>
  );
}
