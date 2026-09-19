"use client";

import React, { useEffect, useState } from "react";
import { useRestaurant } from "@/context/RestaurantContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminBar, { NavItem } from "@/components/AdminBar";
import Icon, { IconName } from "@/components/Icon";
import Modal from "@/components/Modal";
import Confirm from "@/components/Confirm";
import PopMenu from "@/components/PopMenu";
import printQrTent from "@/lib/printQrTent";

type Tab = "tables" | "bills" | "users" | "analytics";
type Period = "today" | "7days" | "30days" | "all";

interface StaffUser {
  id: string;
  username: string;
  role: string;
  displayName?: string;
  phoneNumber?: string;
  email?: string;
  profileImageUrl?: string;
}

interface Ask {
  title: string;
  body: string;
  label: string;
  run: () => void;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "วันนี้" },
  { key: "7days", label: "7 วัน" },
  { key: "30days", label: "30 วัน" },
  { key: "all", label: "ทั้งหมด" },
];

const PAY_LABEL: Record<string, string> = {
  cash: "เงินสด",
  promptpay: "พร้อมเพย์",
  credit_card: "บัตรเครดิต",
};

const PAY_ICON: Record<string, IconName> = {
  cash: "cash",
  promptpay: "phone",
  credit_card: "card",
};

// The hours the shop is open; anything outside them is noise on the chart
const SERVICE_HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

export default function AdminDashboard() {
  const {
    tables,
    adminToken,
    logout,
    updateOrderStatus,
    refreshAdminData,
    getTableQrCode,
    moveTable,
    addTable,
    deleteTable,
    bills,
    refreshBills,
    deleteBill,
    deleteAllBills,
    adminUser,
    users,
    refreshUsers,
    addUser,
    updateUser,
    deleteUser,
    uploadUserAvatar,
  } = useRestaurant();

  const router = useRouter();
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

  const [activeTab, setActiveTab] = useState<Tab>("tables");
  const [analyticsPeriod, setAnalyticsPeriod] = useState<Period>("7days");
  const [loading, setLoading] = useState(true);
  const [printingTableId, setPrintingTableId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [ask, setAsk] = useState<Ask | null>(null);

  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [moveSourceTable, setMoveSourceTable] = useState<{
    id: string;
    number: string;
  } | null>(null);
  const [selectedTargetTableId, setSelectedTargetTableId] = useState("");
  const [openTableMenuId, setOpenTableMenuId] = useState<string | null>(null);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");

  const [userFormMode, setUserFormMode] = useState<"add" | "edit" | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("staff");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formPhoneNumber, setFormPhoneNumber] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formProfileImageUrl, setFormProfileImageUrl] = useState("");
  const [formError, setFormError] = useState("");

  // Close the per-table menu when attention moves elsewhere
  useEffect(() => {
    const close = () => setOpenTableMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    if (!adminToken) {
      router.push("/admin/login");
    } else {
      setLoading(false);
      refreshAdminData();
      refreshBills();
      if (adminUser?.role === "admin") {
        refreshUsers();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken, adminUser, router]);

  const isManager = adminUser?.role === "admin";
  const staff = users as StaffUser[];

  const tableList = [...tables].sort((a, b) => a.number.localeCompare(b.number));
  const occupiedCount = tableList.filter((t) => t.status === "occupied").length;

  const dishesInKitchen = tableList.reduce(
    (sum, t) =>
      sum +
      t.orders.filter((o) => o.status === "pending" || o.status === "preparing")
        .length,
    0
  );

  const moneyOnFloor = tableList.reduce((sum, t) => {
    if (t.status !== "occupied") return sum;
    return (
      sum + t.orders.reduce((s, o) => s + o.menuItem.price * o.quantity, 0)
    );
  }, 0);

  const avatarSrc = (raw?: string) =>
    raw
      ? raw.startsWith("http")
        ? raw
        : `${API_URL.replace("/api", "")}${raw}`
      : null;

  /* ---------------------------------------------------------------- staff */

  const openAddUser = () => {
    setEditingUserId(null);
    setFormUsername("");
    setFormPassword("");
    setFormRole("staff");
    setFormDisplayName("");
    setFormPhoneNumber("");
    setFormEmail("");
    setFormProfileImageUrl("");
    setFormError("");
    setUserFormMode("add");
  };

  const openEditUser = (user: StaffUser) => {
    setEditingUserId(user.id);
    setFormUsername(user.username);
    setFormPassword("");
    setFormRole(user.role);
    setFormDisplayName(user.displayName || "");
    setFormPhoneNumber(user.phoneNumber || "");
    setFormEmail(user.email || "");
    setFormProfileImageUrl(user.profileImageUrl || "");
    setFormError("");
    setUserFormMode("edit");
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    const url = await uploadUserAvatar(file);
    setAvatarLoading(false);
    if (url) {
      setFormProfileImageUrl(url);
    } else {
      setFormError("อัปโหลดรูปไม่สำเร็จ ลองไฟล์เล็กลงแล้วเลือกใหม่");
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (userFormMode === "add") {
      const success = await addUser({
        username: formUsername,
        password: formPassword,
        role: formRole,
        displayName: formDisplayName,
        phoneNumber: formPhoneNumber,
        email: formEmail,
        profileImageUrl: formProfileImageUrl,
      });
      if (success) {
        setUserFormMode(null);
        setNotice(`เพิ่มบัญชีของ ${formDisplayName || formUsername} แล้ว`);
      } else {
        setFormError("บันทึกไม่สำเร็จ ชื่อผู้ใช้นี้อาจถูกใช้ไปแล้ว");
      }
      return;
    }

    if (!editingUserId) return;
    const payload: Record<string, string> = {
      role: formRole,
      displayName: formDisplayName,
      phoneNumber: formPhoneNumber,
      email: formEmail,
      profileImageUrl: formProfileImageUrl,
    };
    if (formPassword) payload.password = formPassword;

    const success = await updateUser(editingUserId, payload);
    if (success) {
      setUserFormMode(null);
      setNotice(`บันทึกข้อมูลของ ${formDisplayName || formUsername} แล้ว`);
    } else {
      setFormError("บันทึกไม่สำเร็จ ลองอีกครั้ง");
    }
  };

  /* --------------------------------------------------------------- tables */

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveSourceTable || !selectedTargetTableId) return;

    const target = tables.find((t) => t.tableId === selectedTargetTableId);
    if (!target) return;

    const success = await moveTable(moveSourceTable.id, selectedTargetTableId);
    if (success) {
      setNotice(
        `ย้ายรายการของโต๊ะ ${moveSourceTable.number} ไปโต๊ะ ${target.number} แล้ว`
      );
      setIsMoveOpen(false);
      setMoveSourceTable(null);
      setSelectedTargetTableId("");
    } else {
      setFormError("ย้ายไม่สำเร็จ ลองอีกครั้ง");
    }
  };

  const handleAddTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const wanted = newTableNumber.trim();
    setFormError("");
    if (!wanted) return;

    if (tables.some((t) => t.number.toLowerCase() === wanted.toLowerCase())) {
      setFormError(`มีโต๊ะ ${wanted} อยู่แล้ว ใช้หมายเลขอื่น`);
      return;
    }

    const success = await addTable(wanted);
    if (success) {
      setIsAddTableOpen(false);
      setNewTableNumber("");
      setNotice(`เพิ่มโต๊ะ ${wanted} แล้ว อย่าลืมพิมพ์การ์ดโค้ดไปตั้งบนโต๊ะ`);
    } else {
      setFormError("เพิ่มโต๊ะไม่สำเร็จ ลองอีกครั้ง");
    }
  };

  // Cancels every live order on a table and hands it back empty
  const resetTable = async (tableId: string) => {
    const tableState = tables.find((t) => t.tableId === tableId);
    if (!tableState) return;

    const orderIds = Array.from(
      new Set(tableState.orders.map((o) => o.id.split("_")[0]))
    );
    for (const orderId of orderIds) {
      await updateOrderStatus(orderId, "cancelled");
    }
    setNotice(`ล้างโต๊ะ ${tableState.number} แล้ว`);
  };

  const handlePrintTableQr = async (tableId: string, tableNumber: string) => {
    setPrintingTableId(tableId);
    try {
      const code = await getTableQrCode(tableId);
      if (!code) {
        setNotice("ดึงโค้ดของโต๊ะไม่สำเร็จ ตรวจการเชื่อมต่อหลังบ้าน");
        return;
      }
      if (!printQrTent(code, tableNumber)) {
        setNotice("เบราว์เซอร์บล็อกหน้าต่างพิมพ์ อนุญาตป๊อปอัปของหน้านี้ก่อน");
      }
    } catch (err) {
      console.error("Print QR error:", err);
      setNotice("พิมพ์โค้ดไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setPrintingTableId(null);
    }
  };

  /* ------------------------------------------------------------ analytics */

  const periodBills = bills.filter((b) => {
    const t = new Date(b.createdAt).getTime();
    const now = new Date();
    if (analyticsPeriod === "today") {
      return (
        t >= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      );
    }
    if (analyticsPeriod === "7days") {
      return t >= now.getTime() - 7 * 86400000;
    }
    if (analyticsPeriod === "30days") {
      return t >= now.getTime() - 30 * 86400000;
    }
    return true;
  });

  const totalRevenue = periodBills.reduce((sum, b) => sum + b.totalPrice, 0);
  const billCount = periodBills.length;
  const averageBill = billCount > 0 ? totalRevenue / billCount : 0;

  const paymentCounts = periodBills.reduce(
    (acc, b) => {
      const method = b.paymentMethod || "cash";
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    },
    { cash: 0, promptpay: 0, credit_card: 0 } as Record<string, number>
  );

  const topPaymentCount = Math.max(
    paymentCounts.cash,
    paymentCounts.promptpay,
    paymentCounts.credit_card
  );

  const itemSales = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();
  periodBills.forEach((b) => {
    b.items.forEach((item) => {
      const found = itemSales.get(item.name);
      if (found) {
        found.quantity += item.quantity;
        found.revenue += item.price * item.quantity;
      } else {
        itemSales.set(item.name, {
          name: item.name,
          quantity: item.quantity,
          revenue: item.price * item.quantity,
        });
      }
    });
  });

  const bestSellers = Array.from(itemSales.values()).sort(
    (a, b) => b.quantity - a.quantity
  );
  const topQuantity = bestSellers.length > 0 ? bestSellers[0].quantity : 1;

  const hourlyBills = Array(24).fill(0) as number[];
  periodBills.forEach((b) => {
    hourlyBills[new Date(b.createdAt).getHours()] += 1;
  });
  const busiestCount = Math.max(...SERVICE_HOURS.map((h) => hourlyBills[h]), 0);
  const busiestHour = SERVICE_HOURS.find((h) => hourlyBills[h] === busiestCount);

  const periodWords =
    analyticsPeriod === "today"
      ? "วันนี้"
      : analyticsPeriod === "7days"
        ? "ใน 7 วันที่ผ่านมา"
        : analyticsPeriod === "30days"
          ? "ใน 30 วันที่ผ่านมา"
          : "ตั้งแต่เปิดร้าน";

  /* ------------------------------------------------------------------ nav */

  const navItems: NavItem[] = [
    { kind: "tab", key: "tables", label: "โต๊ะ", icon: "table" },
    { kind: "tab", key: "bills", label: "บิล", icon: "receipt" },
    ...(isManager
      ? ([
          { kind: "tab", key: "users", label: "พนักงาน", icon: "users" },
          { kind: "tab", key: "analytics", label: "ยอดขาย", icon: "chart" },
        ] as NavItem[])
      : []),
    { kind: "link", href: "/admin/kitchen", label: "จอครัว", icon: "flame" },
    { kind: "link", href: "/admin/menu", label: "เมนู", icon: "bowl" },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg">
        <div className="flex flex-col items-center gap-3 text-ink-soft">
          <span className="spinner h-8 w-8 text-primary" />
          <p className="text-sm">กำลังตรวจสิทธิ์การเข้าใช้</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <AdminBar
        room="ระบบหลังร้าน"
        items={navItems}
        activeKey={activeTab}
        onSelect={(key) => setActiveTab(key as Tab)}
        user={adminUser}
        onLogout={logout}
        apiUrl={API_URL}
      />

      {/* How the shift is going, read straight off the floor */}
      {activeTab === "tables" && (
        <div className="border-b border-edge bg-shell">
          <div className="mx-auto flex max-w-6xl divide-x divide-edge px-4 md:px-6">
            {[
              {
                value: `${occupiedCount}/${tableList.length}`,
                label: "โต๊ะที่มีลูกค้าอยู่",
              },
              { value: `${dishesInKitchen}`, label: "จานที่ครัวยังทำอยู่" },
              {
                value: `${moneyOnFloor.toLocaleString("th-TH")} ฿`,
                label: "เงินที่ยังอยู่บนโต๊ะ",
              },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`min-w-0 py-4 ${
                  i === 0 ? "pr-4 sm:pr-6" : "px-4 sm:px-6"
                }`}
              >
                <p className="font-display text-xl font-bold whitespace-nowrap tabular-nums sm:text-2xl md:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-ink-soft">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        {notice && (
          <p
            role="status"
            className="mb-5 flex items-start gap-2 rounded-tile border border-edge bg-brand-card px-3.5 py-3 text-sm leading-relaxed text-ink-soft"
          >
            <Icon name="check" size={16} className="mt-0.5 text-done" />
            <span className="flex-1">{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="ปิดข้อความ"
              className="text-ink-faint hover:text-ink"
            >
              <Icon name="close" size={15} />
            </button>
          </p>
        )}

        {/* ------------------------------------------------------- tables */}
        {activeTab === "tables" && (
          <section>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h1 className="font-display text-xl font-bold tracking-tight">
                  โต๊ะทั้งหมดในร้าน
                </h1>
                <p className="mt-1 text-sm text-ink-soft">
                  เปิดบิลได้จากโต๊ะที่มีลูกค้า ส่วนการพิมพ์โค้ดและจัดการโต๊ะอยู่ในปุ่มตัวเลือกของแต่ละโต๊ะ
                </p>
              </div>

              {isManager && (
                <button
                  type="button"
                  onClick={() => {
                    setFormError("");
                    setIsAddTableOpen(true);
                  }}
                  className="btn btn-red"
                >
                  <Icon name="plus" size={17} />
                  เพิ่มโต๊ะ
                </button>
              )}
            </div>

            {tableList.length === 0 ? (
              <div className="panel-sunk px-6 py-16 text-center">
                <h2 className="font-display text-lg font-bold">
                  ยังไม่มีโต๊ะในระบบ
                </h2>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
                  เพิ่มโต๊ะตามผังร้าน แล้วพิมพ์การ์ดโค้ดไปตั้งไว้บนแต่ละโต๊ะ
                </p>
                {isManager && (
                  <button
                    type="button"
                    onClick={() => setIsAddTableOpen(true)}
                    className="btn btn-red mt-6"
                  >
                    เพิ่มโต๊ะแรก
                  </button>
                )}
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {tableList.map((tbl) => {
                  const total = tbl.orders.reduce(
                    (sum, o) => sum + o.menuItem.price * o.quantity,
                    0
                  );
                  const waiting = tbl.orders.filter(
                    (o) => o.status === "pending"
                  ).length;
                  const cooking = tbl.orders.filter(
                    (o) => o.status === "preparing"
                  ).length;
                  const busy = tbl.status === "occupied";

                  return (
                    <li
                      key={tbl.tableId}
                      className={`relative flex flex-col overflow-hidden ${
                        busy ? "panel" : "panel-sunk"
                      }`}
                    >
                      {busy && (
                        <span
                          className="absolute inset-y-0 left-0 w-1 bg-primary"
                          aria-hidden="true"
                        />
                      )}

                      <div className="flex flex-1 flex-col gap-2 p-3.5 pl-4">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="flex items-baseline gap-1.5">
                            <span className="text-xs text-ink-faint">โต๊ะ</span>
                            <span className="font-display text-2xl font-bold tabular-nums">
                              {tbl.number}
                            </span>
                          </span>
                          {busy ? (
                            <span className="mark mark-hot">มีลูกค้า</span>
                          ) : (
                            <span className="mark mark-off">ว่าง</span>
                          )}
                        </div>

                        {busy ? (
                          <>
                            <div className="flex flex-wrap gap-1.5">
                              {waiting > 0 && (
                                <span className="mark mark-wait">
                                  รอครัวรับ {waiting}
                                </span>
                              )}
                              {cooking > 0 && (
                                <span className="mark mark-cook">
                                  กำลังปรุง {cooking}
                                </span>
                              )}
                              {waiting === 0 && cooking === 0 && (
                                <span className="mark mark-done">
                                  เสิร์ฟครบแล้ว
                                </span>
                              )}
                            </div>

                            <div className="mt-auto flex items-baseline gap-2 pt-1">
                              <span className="text-xs text-ink-soft">
                                ยอดบนโต๊ะ
                              </span>
                              <span className="leader" />
                              <span className="font-display font-bold tabular-nums text-primary-dark">
                                {total.toLocaleString("th-TH")} ฿
                              </span>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs leading-relaxed text-ink-faint">
                            พร้อมรับลูกค้าชุดถัดไป
                          </p>
                        )}
                      </div>

                      <div className="mt-auto flex items-center gap-1.5 border-t border-edge-soft p-2.5 pl-3">
                        {busy && (
                          <Link
                            href={`/admin/table/${tbl.tableId}`}
                            className="btn btn-ink btn-sm flex-1"
                          >
                            เปิดบิล
                          </Link>
                        )}

                        <PopMenu
                          label={`ตัวเลือกของโต๊ะ ${tbl.number}`}
                          className="ml-auto"
                          open={openTableMenuId === tbl.tableId}
                          onOpenChange={(next) =>
                            setOpenTableMenuId(next ? tbl.tableId : null)
                          }
                        >
                          {busy && (
                            <button
                              type="button"
                              onClick={() => {
                                setMoveSourceTable({
                                  id: tbl.tableId,
                                  number: tbl.number,
                                });
                                setSelectedTargetTableId("");
                                setFormError("");
                                setIsMoveOpen(true);
                                setOpenTableMenuId(null);
                              }}
                              className="btn btn-quiet w-full justify-start text-sm"
                            >
                              <Icon name="move" size={16} />
                              ย้ายไปโต๊ะอื่น
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={printingTableId === tbl.tableId}
                            onClick={() => {
                              handlePrintTableQr(tbl.tableId, tbl.number);
                              setOpenTableMenuId(null);
                            }}
                            className="btn btn-quiet w-full justify-start text-sm"
                          >
                            {printingTableId === tbl.tableId ? (
                              <span className="spinner h-4 w-4" />
                            ) : (
                              <Icon name="print" size={16} />
                            )}
                            พิมพ์การ์ดโค้ด
                          </button>

                          <Link
                            href={`/table/${tbl.tableId}`}
                            target="_blank"
                            onClick={() => setOpenTableMenuId(null)}
                            className="btn btn-quiet w-full justify-start text-sm"
                          >
                            <Icon name="link" size={16} />
                            เปิดอย่างที่ลูกค้าเห็น
                          </Link>

                          {busy ? (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenTableMenuId(null);
                                setAsk({
                                  title: `ล้างโต๊ะ ${tbl.number}`,
                                  body: "รายการที่ยังไม่ได้เสิร์ฟจะถูกยกเลิกทั้งหมดและโต๊ะจะกลับมาว่าง ใช้เมื่อลูกค้าลุกไปโดยไม่ได้สั่ง",
                                  label: "ยกเลิกและล้างโต๊ะ",
                                  run: () => resetTable(tbl.tableId),
                                });
                              }}
                              className="btn btn-quiet w-full justify-start text-sm text-primary-dark hover:bg-primary/5"
                            >
                              <Icon name="undo" size={16} />
                              ล้างโต๊ะ
                            </button>
                          ) : (
                            isManager && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenTableMenuId(null);
                                  setAsk({
                                    title: `ลบโต๊ะ ${tbl.number}`,
                                    body: "โต๊ะนี้จะหายจากระบบถาวร และการ์ดโค้ดที่พิมพ์ไปแล้วจะใช้ไม่ได้อีก",
                                    label: "ลบโต๊ะนี้",
                                    run: async () => {
                                      const ok = await deleteTable(
                                        tbl.tableId
                                      );
                                      setNotice(
                                        ok
                                          ? `ลบโต๊ะ ${tbl.number} แล้ว`
                                          : "ลบโต๊ะไม่สำเร็จ ลองอีกครั้ง"
                                      );
                                    },
                                  });
                                }}
                                className="btn btn-quiet w-full justify-start text-sm text-primary-dark hover:bg-primary/5"
                              >
                                <Icon name="trash" size={16} />
                                ลบโต๊ะนี้
                              </button>
                            )
                          )}
                        </PopMenu>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* -------------------------------------------------------- bills */}
        {activeTab === "bills" && (
          <section className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h1 className="font-display text-xl font-bold tracking-tight">
                  บิลที่รับเงินแล้ว
                </h1>
                <p className="mt-1 text-sm text-ink-soft">
                  กดที่บิลเพื่อดูว่าโต๊ะนั้นสั่งอะไรไปบ้าง
                </p>
              </div>

              {bills.length > 0 && isManager && (
                <button
                  type="button"
                  onClick={() =>
                    setAsk({
                      title: "ลบบิลทั้งหมด",
                      body: `ประวัติการรับเงินทั้ง ${bills.length} ใบจะหายถาวร รายงานยอดขายจะว่างตามไปด้วย`,
                      label: "ลบทั้งหมด",
                      run: async () => {
                        const ok = await deleteAllBills();
                        setNotice(
                          ok ? "ลบบิลทั้งหมดแล้ว" : "ลบไม่สำเร็จ ลองอีกครั้ง"
                        );
                      },
                    })
                  }
                  className="btn btn-danger btn-sm"
                >
                  <Icon name="trash" size={15} />
                  ลบบิลทั้งหมด
                </button>
              )}
            </div>

            {bills.length === 0 ? (
              <div className="panel-sunk px-6 py-16 text-center">
                <h2 className="font-display text-lg font-bold">
                  ยังไม่มีบิลที่รับเงินแล้ว
                </h2>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
                  ทุกครั้งที่กดรับเงินจากหน้าโต๊ะ บิลใบนั้นจะมาเก็บไว้ที่นี่
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("tables")}
                  className="btn btn-plain mt-6"
                >
                  ไปดูโต๊ะที่มีลูกค้า
                </button>
              </div>
            ) : (
              <>
                <div className="panel-sunk mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm">
                  <span className="text-ink-soft">
                    เก็บเงินไปแล้ว {bills.length} ใบ รวมเป็น
                  </span>
                  <span className="leader" />
                  <span className="font-display text-lg font-bold tabular-nums text-done">
                    {bills
                      .reduce((sum, b) => sum + b.totalPrice, 0)
                      .toLocaleString("th-TH")}{" "}
                    ฿
                  </span>
                </div>

                <ul className="panel divide-y divide-edge-soft overflow-hidden">
                  {bills.map((bill) => {
                    const when = new Date(bill.createdAt).toLocaleString(
                      "th-TH",
                      {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    );
                    const cashier =
                      bill.cashierName || bill.cashierUsername || null;

                    return (
                      <li key={bill.id}>
                        <details className="group">
                          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 hover:bg-shell/60">
                            <span className="font-display flex items-baseline gap-1.5">
                              <span className="text-xs text-ink-faint">โต๊ะ</span>
                              <span className="text-lg font-bold tabular-nums">
                                {bill.tableNumber || "—"}
                              </span>
                            </span>

                            <span className="text-sm text-ink-soft">{when} น.</span>

                            <span className="mark mark-off">
                              <Icon
                                name={PAY_ICON[bill.paymentMethod] || "cash"}
                                size={13}
                              />
                              {PAY_LABEL[bill.paymentMethod] || "เงินสด"}
                            </span>

                            {cashier && (
                              <span className="text-xs text-ink-faint">
                                รับโดย {cashier}
                              </span>
                            )}

                            <span className="leader" />

                            <span className="font-display text-lg font-bold tabular-nums">
                              {bill.totalPrice.toLocaleString("th-TH")}
                              <span className="ml-0.5 text-xs font-semibold text-ink-faint">
                                ฿
                              </span>
                            </span>

                            <Icon
                              name="down"
                              size={16}
                              className="text-ink-faint transition-transform group-open:rotate-180"
                            />
                          </summary>

                          <div className="border-t border-edge-soft bg-shell px-4 py-3.5">
                            <ul className="flex flex-col gap-1.5">
                              {bill.items.map((item, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-baseline gap-2 text-sm"
                                >
                                  <span>{item.name}</span>
                                  <span className="text-ink-faint tabular-nums">
                                    ×{item.quantity}
                                  </span>
                                  <span className="leader" />
                                  <span className="tabular-nums">
                                    {(item.price * item.quantity).toLocaleString(
                                      "th-TH"
                                    )}{" "}
                                    ฿
                                  </span>
                                </li>
                              ))}
                            </ul>

                            {isManager && (
                              <button
                                type="button"
                                onClick={() =>
                                  setAsk({
                                    title: "ลบบิลใบนี้",
                                    body: `บิลของโต๊ะ ${
                                      bill.tableNumber || "—"
                                    } ยอด ${bill.totalPrice.toLocaleString(
                                      "th-TH"
                                    )} ฿ จะหายจากประวัติและจากรายงานยอดขาย`,
                                    label: "ลบบิลใบนี้",
                                    run: async () => {
                                      const ok = await deleteBill(bill.id);
                                      setNotice(
                                        ok
                                          ? "ลบบิลแล้ว"
                                          : "ลบไม่สำเร็จ ลองอีกครั้ง"
                                      );
                                    },
                                  })
                                }
                                className="btn btn-danger btn-sm mt-3"
                              >
                                <Icon name="trash" size={15} />
                                ลบบิลใบนี้
                              </button>
                            )}
                          </div>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        )}

        {/* -------------------------------------------------------- staff */}
        {activeTab === "users" && isManager && (
          <section className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h1 className="font-display text-xl font-bold tracking-tight">
                  คนที่เข้าใช้ระบบหลังร้านได้
                </h1>
                <p className="mt-1 text-sm text-ink-soft">
                  {staff.length === 0
                    ? "ยังไม่มีบัญชีพนักงาน"
                    : `ทั้งหมด ${staff.length} คน เป็นผู้จัดการ ${
                        staff.filter((u) => u.role === "admin").length
                      } คน และพนักงานหน้างาน ${
                        staff.filter((u) => u.role !== "admin").length
                      } คน`}
                </p>
              </div>

              <button type="button" onClick={openAddUser} className="btn btn-red">
                <Icon name="plus" size={17} />
                เพิ่มบัญชี
              </button>
            </div>

            {staff.length === 0 ? (
              <div className="panel-sunk px-6 py-16 text-center">
                <h2 className="font-display text-lg font-bold">
                  ยังไม่มีใครนอกจากคุณ
                </h2>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
                  สร้างบัญชีให้พนักงานหน้างาน แล้วเขาจะเข้าดูจอครัวและเก็บเงินได้
                </p>
                <button
                  type="button"
                  onClick={openAddUser}
                  className="btn btn-red mt-6"
                >
                  เพิ่มบัญชีแรก
                </button>
              </div>
            ) : (
              <ul className="panel divide-y divide-edge-soft overflow-hidden">
                {staff.map((user) => {
                  const isSelf = adminUser?.id === user.id;
                  const src = avatarSrc(user.profileImageUrl);

                  return (
                    <li
                      key={user.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4"
                    >
                      {src ? (
                        // avatars are served by the API host, outside next/image
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-full border border-edge object-cover"
                        />
                      ) : (
                        <span className="font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-shell text-sm font-bold text-ink-soft uppercase">
                          {(user.displayName || user.username).substring(0, 2)}
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <h3 className="font-display font-semibold">
                            {user.displayName || user.username}
                          </h3>
                          {isSelf && (
                            <span className="mark mark-off">บัญชีที่คุณใช้อยู่</span>
                          )}
                          <span
                            className={`mark ${
                              user.role === "admin" ? "mark-hot" : "mark-off"
                            }`}
                          >
                            {user.role === "admin" ? "ผู้จัดการ" : "พนักงานหน้างาน"}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-ink-faint">
                          ชื่อผู้ใช้ {user.username}
                          {user.phoneNumber ? ` โทร ${user.phoneNumber}` : ""}
                          {user.email ? ` อีเมล ${user.email}` : ""}
                        </p>
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditUser(user)}
                          className="btn btn-plain btn-sm"
                        >
                          <Icon name="edit" size={15} />
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          disabled={isSelf}
                          aria-label={`ลบบัญชีของ ${user.displayName || user.username}`}
                          title={
                            isSelf ? "ลบบัญชีที่กำลังใช้อยู่ไม่ได้" : undefined
                          }
                          onClick={() =>
                            setAsk({
                              title: `ลบบัญชีของ ${user.displayName || user.username}`,
                              body: "คนนี้จะเข้าระบบหลังร้านไม่ได้อีก บิลที่เคยรับเงินไว้ยังอยู่ครบ",
                              label: "ลบบัญชีนี้",
                              run: async () => {
                                const ok = await deleteUser(user.id);
                                setNotice(
                                  ok
                                    ? "ลบบัญชีแล้ว"
                                    : "ลบไม่สำเร็จ ลองอีกครั้ง"
                                );
                              },
                            })
                          }
                          className="btn btn-quiet btn-sm px-2.5 hover:bg-primary/5 hover:text-primary-dark disabled:hover:bg-transparent"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* ---------------------------------------------------- analytics */}
        {activeTab === "analytics" && isManager && (
          <section className="flex flex-col gap-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h1 className="font-display text-xl font-bold tracking-tight">
                ยอดขายของร้าน
              </h1>

              <div className="flex overflow-hidden rounded-tile border border-edge">
                {PERIODS.map((p, i) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setAnalyticsPeriod(p.key)}
                    aria-pressed={analyticsPeriod === p.key}
                    className={`font-display px-3.5 py-2 text-sm font-semibold transition-colors ${
                      i > 0 ? "border-l border-edge" : ""
                    } ${
                      analyticsPeriod === p.key
                        ? "bg-ink text-brand-bg"
                        : "bg-brand-card text-ink-soft hover:bg-shell"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* The one number the owner came here for */}
            <div className="panel px-5 py-6 sm:px-7 sm:py-8">
              <p className="font-display text-5xl font-bold tabular-nums leading-none text-primary-dark sm:text-6xl">
                {totalRevenue.toLocaleString("th-TH")}
                <span className="ml-2 text-2xl font-semibold text-ink-faint">
                  ฿
                </span>
              </p>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
                {billCount === 0
                  ? `ยังไม่มีบิลที่รับเงิน${periodWords === "วันนี้" ? "วันนี้" : periodWords}`
                  : `รับเงินไป ${billCount} บิล${periodWords === "วันนี้" ? "วันนี้" : periodWords} เฉลี่ยบิลละ ${Math.round(
                      averageBill
                    ).toLocaleString("th-TH")} ฿`}
              </p>

              {billCount > 0 && (
                <ul className="mt-6 flex max-w-md flex-col gap-3 border-t border-edge-soft pt-5">
                  {(["cash", "promptpay", "credit_card"] as const).map(
                    (method) => {
                      const count = paymentCounts[method] || 0;
                      const share = Math.round((count / billCount) * 100);
                      const isTop = count === topPaymentCount && count > 0;
                      return (
                        <li key={method}>
                          <div className="flex items-baseline gap-2 text-sm">
                            <Icon
                              name={PAY_ICON[method]}
                              size={15}
                              className="text-ink-faint"
                            />
                            <span>{PAY_LABEL[method]}</span>
                            <span className="leader" />
                            <span className="tabular-nums text-ink-soft">
                              {count} บิล
                            </span>
                          </div>
                          <div className="meter mt-1.5">
                            <div
                              className={`meter-fill ${isTop ? "meter-fill-top" : ""}`}
                              style={{ width: `${share}%` }}
                            />
                          </div>
                        </li>
                      );
                    }
                  )}
                </ul>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* The board, ranked */}
              <div className="panel p-5">
                <h2 className="font-display text-base font-bold">
                  จานที่ขายดีที่สุด
                </h2>

                {bestSellers.length === 0 ? (
                  <p className="py-10 text-center text-sm text-ink-soft">
                    ยังไม่มียอดขายในช่วงนี้
                  </p>
                ) : (
                  <ol className="mt-4 flex flex-col gap-3.5">
                    {bestSellers.slice(0, 5).map((item, index) => (
                      <li key={item.name}>
                        <div className="flex items-baseline gap-2 text-sm">
                          <span className="w-4 shrink-0 tabular-nums text-ink-faint">
                            {index + 1}
                          </span>
                          <span className="font-display font-semibold">
                            {item.name}
                          </span>
                          <span className="leader" />
                          <span className="tabular-nums text-ink-soft">
                            {item.quantity} จาน
                          </span>
                          <span className="font-display w-20 shrink-0 text-right font-semibold tabular-nums">
                            {item.revenue.toLocaleString("th-TH")} ฿
                          </span>
                        </div>
                        <div className="meter mt-1.5 ml-6">
                          <div
                            className={`meter-fill ${index === 0 ? "meter-fill-top" : ""}`}
                            style={{
                              width: `${Math.round(
                                (item.quantity / topQuantity) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* When the room fills up */}
              <div className="panel flex flex-col p-5">
                <h2 className="font-display text-base font-bold">
                  ช่วงเวลาที่คนเข้าร้าน
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {billCount === 0
                    ? "ยังไม่มีบิลให้นับในช่วงนี้"
                    : busiestCount > 0
                      ? `คนแน่นที่สุดราว ${busiestHour}.00 น. เก็บบิลไป ${busiestCount} ใบในชั่วโมงนั้น`
                      : "บิลในช่วงนี้อยู่นอกเวลาเปิดร้าน"}
                </p>

                {billCount > 0 && (
                  <div className="mt-6 flex flex-1 flex-col justify-end">
                    <div className="flex h-40 items-end gap-1 border-b border-edge">
                      {SERVICE_HOURS.map((hour) => {
                        const count = hourlyBills[hour];
                        const height =
                          busiestCount > 0
                            ? Math.round((count / busiestCount) * 100)
                            : 0;
                        return (
                          <div
                            key={hour}
                            className="group relative flex flex-1 items-end"
                            style={{ height: "100%" }}
                          >
                            <div
                              className={`w-full ${
                                count === 0
                                  ? "bg-edge-soft"
                                  : count === busiestCount
                                    ? "bg-primary"
                                    : "bg-ink-faint"
                              }`}
                              style={{
                                height: count > 0 ? `${Math.max(height, 4)}%` : "3px",
                              }}
                            />
                            <span className="pointer-events-none absolute inset-x-0 bottom-full mb-1 hidden justify-center group-hover:flex">
                              <span className="rounded-chit bg-ink px-1.5 py-0.5 text-xs tabular-nums text-brand-bg">
                                {count}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-2 flex gap-1 text-xs tabular-nums text-ink-faint">
                      {SERVICE_HOURS.map((hour) => (
                        <span key={hour} className="flex-1 text-center">
                          {hour % 2 === 0 ? hour : ""}
                        </span>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-ink-faint">
                      จำนวนบิลในแต่ละชั่วโมง ตั้งแต่ 10.00 ถึง 22.00 น.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ------------------------------------------------------------ forms */}

      {isAddTableOpen && (
        <Modal
          title="เพิ่มโต๊ะ"
          note="ตั้งหมายเลขให้ตรงกับที่ติดไว้บนโต๊ะจริง พนักงานจะได้ไม่สับสน"
          onClose={() => setIsAddTableOpen(false)}
          width="max-w-sm"
        >
          <form onSubmit={handleAddTableSubmit} className="flex flex-col gap-4">
            {formError && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-tile border border-primary/30 bg-primary/5 px-3.5 py-3 text-sm leading-relaxed text-primary-dark"
              >
                <Icon name="warning" size={16} className="mt-0.5" />
                {formError}
              </p>
            )}

            <div>
              <label htmlFor="table-number" className="field-label">
                หมายเลขโต๊ะ
              </label>
              <input
                id="table-number"
                type="text"
                required
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                placeholder="เช่น 06"
                className="field"
              />
            </div>

            <button type="submit" className="btn btn-red btn-lg w-full">
              เพิ่มโต๊ะ
            </button>
          </form>
        </Modal>
      )}

      {isMoveOpen && moveSourceTable && (
        <Modal
          title={`ย้ายโต๊ะ ${moveSourceTable.number}`}
          note="ใช้เมื่อลูกค้าย้ายที่นั่ง รายการที่สั่งไว้จะตามไปทั้งหมด"
          onClose={() => {
            setIsMoveOpen(false);
            setMoveSourceTable(null);
            setSelectedTargetTableId("");
          }}
          width="max-w-sm"
        >
          <form onSubmit={handleMoveSubmit} className="flex flex-col gap-4">
            {formError && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-tile border border-primary/30 bg-primary/5 px-3.5 py-3 text-sm leading-relaxed text-primary-dark"
              >
                <Icon name="warning" size={16} className="mt-0.5" />
                {formError}
              </p>
            )}

            <div>
              <label htmlFor="move-target" className="field-label">
                ย้ายไปโต๊ะไหน
              </label>
              <select
                id="move-target"
                required
                value={selectedTargetTableId}
                onChange={(e) => setSelectedTargetTableId(e.target.value)}
                className="field"
              >
                <option value="">เลือกโต๊ะปลายทาง</option>
                {tables
                  .filter((t) => t.tableId !== moveSourceTable.id)
                  .sort((a, b) => a.number.localeCompare(b.number))
                  .map((t) => (
                    <option key={t.tableId} value={t.tableId}>
                      โต๊ะ {t.number}
                      {t.status === "occupied"
                        ? " (มีลูกค้าอยู่ บิลจะรวมกัน)"
                        : " (ว่าง)"}
                    </option>
                  ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!selectedTargetTableId}
              className="btn btn-red btn-lg w-full"
            >
              ย้ายรายการไปโต๊ะนี้
            </button>
          </form>
        </Modal>
      )}

      {userFormMode && (
        <Modal
          title={userFormMode === "add" ? "เพิ่มบัญชีพนักงาน" : "แก้ไขบัญชีพนักงาน"}
          note={
            userFormMode === "add"
              ? "ผู้จัดการเห็นยอดขายและจัดการบัญชีได้ พนักงานหน้างานเห็นโต๊ะ ครัว และเก็บเงิน"
              : "เว้นช่องรหัสผ่านไว้ถ้าไม่ต้องการเปลี่ยน"
          }
          onClose={() => setUserFormMode(null)}
          width="max-w-lg"
        >
          <form onSubmit={handleUserSubmit} className="flex flex-col gap-4">
            {formError && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-tile border border-primary/30 bg-primary/5 px-3.5 py-3 text-sm leading-relaxed text-primary-dark"
              >
                <Icon name="warning" size={16} className="mt-0.5" />
                {formError}
              </p>
            )}

            <div className="flex items-center gap-4">
              <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-edge bg-shell">
                {formProfileImageUrl ? (
                  // avatars are served by the API host, outside next/image
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarSrc(formProfileImageUrl) || ""}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Icon name="user" size={26} className="text-ink-faint" />
                )}
                {avatarLoading && (
                  <span className="absolute inset-0 flex items-center justify-center bg-ink/50">
                    <span className="spinner h-5 w-5 text-white" />
                  </span>
                )}
              </span>

              <div className="min-w-0 flex-1">
                <span className="field-label">รูปประจำตัว</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  aria-label="เลือกรูปประจำตัว"
                  className="w-full text-xs text-ink-soft file:mr-3 file:cursor-pointer file:rounded-tile file:border file:border-edge file:bg-brand-card file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ink hover:file:bg-shell"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="u-name" className="field-label">
                  ชื่อที่ให้คนอื่นเห็น
                </label>
                <input
                  id="u-name"
                  type="text"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี"
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="u-role" className="field-label">
                  เข้าถึงได้แค่ไหน
                </label>
                <select
                  id="u-role"
                  value={formRole}
                  disabled={adminUser?.id === editingUserId}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="field"
                >
                  <option value="staff">พนักงานหน้างาน</option>
                  <option value="admin">ผู้จัดการ</option>
                </select>
              </div>

              <div>
                <label htmlFor="u-user" className="field-label">
                  ชื่อผู้ใช้
                </label>
                <input
                  id="u-user"
                  type="text"
                  required={userFormMode === "add"}
                  disabled={userFormMode === "edit"}
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="เช่น somchai"
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="u-pass" className="field-label">
                  {userFormMode === "add" ? "รหัสผ่าน" : "ตั้งรหัสผ่านใหม่"}
                </label>
                <input
                  id="u-pass"
                  type="password"
                  required={userFormMode === "add"}
                  autoComplete="new-password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={
                    userFormMode === "add" ? "" : "เว้นว่างถ้าไม่เปลี่ยน"
                  }
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="u-phone" className="field-label">
                  เบอร์โทร
                </label>
                <input
                  id="u-phone"
                  type="tel"
                  value={formPhoneNumber}
                  onChange={(e) => setFormPhoneNumber(e.target.value)}
                  placeholder="0812345678"
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="u-email" className="field-label">
                  อีเมล
                </label>
                <input
                  id="u-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="somchai@email.com"
                  className="field"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-red btn-lg mt-1 w-full">
              {userFormMode === "add" ? "สร้างบัญชี" : "บันทึกการแก้ไข"}
            </button>
          </form>
        </Modal>
      )}

      {ask && (
        <Confirm
          title={ask.title}
          body={ask.body}
          confirmLabel={ask.label}
          onCancel={() => setAsk(null)}
          onConfirm={() => {
            ask.run();
            setAsk(null);
          }}
        />
      )}
    </div>
  );
}
