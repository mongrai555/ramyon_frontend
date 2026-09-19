"use client";

import React, { useState, useEffect } from "react";
import { useRestaurant } from "@/context/RestaurantContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminBar from "@/components/AdminBar";
import Icon, { IconName } from "@/components/Icon";
import Thumb from "@/components/Thumb";
import printQrTent from "@/lib/printQrTent";

interface AdminTableClientPageProps {
  tableId: string;
}

const STATUS_STEPS = [
  { key: "pending", label: "รอรับ" },
  { key: "preparing", label: "กำลังปรุง" },
  { key: "served", label: "เสิร์ฟแล้ว" },
] as const;

const PAYMENTS: { key: string; label: string; icon: IconName }[] = [
  { key: "cash", label: "เงินสด", icon: "cash" },
  { key: "promptpay", label: "พร้อมเพย์", icon: "phone" },
  { key: "credit_card", label: "บัตร", icon: "card" },
];

export default function AdminTableClientPage({
  tableId,
}: AdminTableClientPageProps) {
  const {
    tables,
    adminToken,
    adminUser,
    logout,
    checkoutTable,
    updateOrderStatus,
    getTableQrCode,
  } = useRestaurant();
  const router = useRouter();
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

  const [paid, setPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken) {
      router.push("/admin/login");
    } else {
      setLoading(false);
    }
  }, [adminToken, router]);

  useEffect(() => {
    async function loadQr() {
      if (!adminToken) return;
      const code = await getTableQrCode(tableId);
      setQrCode(code);
    }
    loadQr();
  }, [tableId, adminToken, getTableQrCode]);

  const tableState = tables.find((t) => t.tableId === tableId);
  const activeOrders = tableState ? tableState.orders : [];
  const tableNumber = tableState ? tableState.number : "…";

  const grandTotal = activeOrders.reduce(
    (sum, ord) => sum + ord.menuItem.price * ord.quantity,
    0
  );
  const dishCount = activeOrders.reduce((sum, ord) => sum + ord.quantity, 0);
  const waitingCount = activeOrders.filter(
    (o) => o.status === "pending" || o.status === "preparing"
  ).length;

  const handleCheckout = async () => {
    if (activeOrders.length === 0) return;
    setError("");

    const activeOrderIds = Array.from(
      new Set(activeOrders.map((ord) => ord.id.split("_")[0]))
    );

    const success = await checkoutTable(tableId, activeOrderIds, paymentMethod);
    if (success) {
      setPaid(true);
      setTimeout(() => router.push("/admin"), 2000);
    } else {
      setError("บันทึกการชำระเงินไม่สำเร็จ ตรวจการเชื่อมต่อแล้วกดอีกครั้ง");
    }
  };

  const handleStatusChange = async (orderItemId: string, newStatus: string) => {
    setError("");
    const orderId = orderItemId.split("_")[0];
    const success = await updateOrderStatus(orderId, newStatus);
    if (!success) {
      setError("เปลี่ยนสถานะไม่สำเร็จ ลองอีกครั้ง");
    }
  };

  const handlePrintQr = () => {
    if (!qrCode) return;
    if (!printQrTent(qrCode, tableNumber)) {
      setError("เบราว์เซอร์บล็อกหน้าต่างพิมพ์ อนุญาตป๊อปอัปของหน้านี้ก่อน");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg">
        <div className="flex flex-col items-center gap-3 text-ink-soft">
          <span className="spinner h-8 w-8 text-primary" />
          <p className="text-sm">กำลังเปิดบิลของโต๊ะ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <AdminBar
        room={`บิลโต๊ะ ${tableNumber}`}
        user={adminUser}
        onLogout={logout}
        apiUrl={API_URL}
        lead={
          <Link href="/admin" className="btn btn-dark-quiet btn-sm">
            <Icon name="back" size={16} />
            <span className="hidden sm:inline">แดชบอร์ด</span>
          </Link>
        }
        items={[
          {
            kind: "link",
            href: "/admin/kitchen",
            label: "จอครัว",
            icon: "flame",
          },
          { kind: "link", href: "/admin/menu", label: "เมนู", icon: "bowl" },
        ]}
      />

      {/* Which table this is, and what is still owed to it */}
      <div className="border-b border-edge bg-shell">
        <div className="mx-auto flex max-w-5xl flex-wrap items-baseline gap-x-6 gap-y-2 px-4 py-4 md:px-6">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            โต๊ะ {tableNumber}
          </h1>
          <p className="text-sm text-ink-soft">
            {activeOrders.length === 0
              ? "ยังไม่มีรายการค้างในโต๊ะนี้"
              : `${dishCount} จานบนโต๊ะ${
                  waitingCount > 0 ? ` ครัวยังทำอยู่ ${waitingCount} รายการ` : " ครัวเสิร์ฟครบแล้ว"
                }`}
          </p>
        </div>
      </div>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:flex-row lg:items-start">
        {/* Everything the table has asked for, and where the kitchen is on it */}
        <section className="min-w-0 flex-1">
          {error && (
            <p
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-tile border border-primary/30 bg-primary/5 px-3.5 py-3 text-sm leading-relaxed text-primary-dark"
            >
              <Icon name="warning" size={16} className="mt-0.5" />
              {error}
            </p>
          )}

          {activeOrders.length === 0 ? (
            <div className="panel-sunk px-6 py-16 text-center">
              <h2 className="font-display text-lg font-bold">โต๊ะนี้ว่างอยู่</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
                เมื่อลูกค้าสแกนโค้ดบนโต๊ะแล้วส่งออเดอร์ รายการจะขึ้นที่นี่ทันที
              </p>
              <Link href="/admin" className="btn btn-plain mt-6">
                <Icon name="back" size={16} />
                กลับไปดูโต๊ะทั้งหมด
              </Link>
            </div>
          ) : (
            <ul className="panel divide-y divide-edge-soft overflow-hidden">
              {activeOrders.map((ord) => (
                <li key={ord.id} className="flex gap-3 p-4">
                  <Thumb
                    src={ord.menuItem.imageUrl}
                    emoji={ord.menuItem.emoji}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-display text-base font-semibold">
                        {ord.menuItem.name}
                      </h3>
                      <span className="text-sm tabular-nums text-ink-soft">
                        ×{ord.quantity}
                      </span>
                      <span className="leader" />
                      <span className="font-display shrink-0 font-semibold tabular-nums">
                        {ord.menuItem.price * ord.quantity}
                        <span className="ml-0.5 text-xs font-semibold text-ink-faint">
                          ฿
                        </span>
                      </span>
                    </div>

                    <p className="mt-0.5 text-xs text-ink-faint">
                      สั่งเมื่อ {ord.timestamp} น. (จานละ {ord.menuItem.price} ฿)
                    </p>

                    {ord.specialNotes && (
                      <p className="mt-2 flex items-start gap-1.5 rounded-chit bg-wait-tint px-2 py-1.5 text-xs leading-relaxed text-wait">
                        <Icon name="note" size={13} className="mt-px" />
                        {ord.specialNotes}
                      </p>
                    )}

                    {/* The whole ticket moves together, the way the kitchen works */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="flex overflow-hidden rounded-tile border border-edge">
                        {STATUS_STEPS.map((step, i) => {
                          const on = ord.status === step.key;
                          return (
                            <button
                              key={step.key}
                              type="button"
                              onClick={() =>
                                handleStatusChange(ord.id, step.key)
                              }
                              aria-pressed={on}
                              className={`font-display px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                i > 0 ? "border-l border-edge" : ""
                              } ${
                                on
                                  ? step.key === "pending"
                                    ? "bg-wait-tint text-wait"
                                    : step.key === "preparing"
                                      ? "bg-cook-tint text-cook"
                                      : "bg-done-tint text-done"
                                  : "bg-brand-card text-ink-faint hover:bg-shell hover:text-ink"
                              }`}
                            >
                              {step.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* The bill itself, and the code that put it there */}
        <aside className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-24 lg:w-80">
          <div className="panel overflow-hidden">
            <div className="px-5 pt-5">
              <h2 className="font-display text-base font-bold">บิลของโต๊ะนี้</h2>

              <dl className="mt-4 flex flex-col gap-2 text-sm">
                <div className="flex items-baseline gap-3">
                  <dt className="text-ink-soft">จำนวนจาน</dt>
                  <span className="leader" />
                  <dd className="tabular-nums">{dishCount}</dd>
                </div>
                <div className="flex items-baseline gap-3">
                  <dt className="text-ink-soft">รายการในบิล</dt>
                  <span className="leader" />
                  <dd className="tabular-nums">{activeOrders.length}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-4 border-t border-edge bg-shell px-5 py-4">
              <div className="flex items-baseline gap-3">
                <p className="font-display font-semibold">ยอดที่ต้องเก็บ</p>
                <span className="leader" />
                <span className="font-display text-3xl font-bold tabular-nums text-primary-dark">
                  {grandTotal.toLocaleString("th-TH")}
                  <span className="ml-1 text-base font-semibold text-ink-faint">
                    ฿
                  </span>
                </span>
              </div>
            </div>

            <div className="px-5 py-4">
              <p className="field-label">รับเงินด้วยวิธีไหน</p>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENTS.map((p) => {
                  const on = paymentMethod === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPaymentMethod(p.key)}
                      aria-pressed={on}
                      className={`flex flex-col items-center gap-1.5 rounded-tile border px-2 py-3 text-xs font-semibold transition-colors ${
                        on
                          ? "border-primary bg-primary/5 text-primary-dark"
                          : "border-edge bg-brand-card text-ink-soft hover:border-ink-faint"
                      }`}
                    >
                      <Icon name={p.icon} size={20} />
                      {p.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={activeOrders.length === 0}
                className="btn btn-go btn-lg mt-4 w-full"
              >
                <Icon name="check" size={18} />
                รับเงินและปิดโต๊ะ
              </button>

              <p className="mt-2.5 text-xs leading-relaxed text-ink-faint">
                เมื่อกดแล้วบิลจะถูกบันทึกเป็นชำระแล้ว และโต๊ะ {tableNumber}{" "}
                จะกลับมาว่างสำหรับลูกค้าชุดถัดไป
              </p>
            </div>
          </div>

          {/* The code that belongs to this table, ready to reprint */}
          <div className="panel flex items-center gap-4 p-4">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-tile border border-edge bg-white">
              {qrCode ? (
                // data URL produced by the backend
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrCode} alt="" className="h-full w-full" />
              ) : (
                <span className="spinner h-5 w-5 text-ink-faint" />
              )}
            </span>

            <div className="min-w-0">
              <h3 className="font-display text-sm font-semibold">
                โค้ดของโต๊ะ {tableNumber}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                พิมพ์ใหม่เมื่อการ์ดบนโต๊ะหายหรือเปื้อน
              </p>
              <button
                type="button"
                onClick={handlePrintQr}
                disabled={!qrCode}
                className="btn btn-plain btn-sm mt-2.5"
              >
                <Icon name="print" size={15} />
                พิมพ์การ์ดตั้งโต๊ะ
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* The till stamp: the same moment the customer gets when an order lands */}
      {paid && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div className="animate-stamp flex flex-col items-center gap-2 rounded-panel border-4 border-done bg-brand-bg/95 px-10 py-8 text-done shadow-xl">
            <Icon name="check" size={40} strokeWidth={2.4} />
            <p className="font-display text-xl font-bold">
              รับเงินโต๊ะ {tableNumber} แล้ว
            </p>
            <p className="text-sm text-ink-soft">
              เก็บไป {grandTotal.toLocaleString("th-TH")} ฿ กำลังกลับไปหน้าโต๊ะทั้งหมด
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
