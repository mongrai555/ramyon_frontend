"use client";

import React, { useState, useEffect } from "react";
import { useRestaurant, MenuItem, CartItem } from "@/context/RestaurantContext";
import Image from "next/image";
import Icon from "@/components/Icon";

interface TableClientPageProps {
  tableId: string;
}

const STEPS = ["pending", "preparing", "served"] as const;
const STEP_LABEL: Record<string, string> = {
  pending: "ครัวรับออเดอร์แล้ว",
  preparing: "กำลังปรุง",
  served: "เสิร์ฟแล้ว",
};
const STEP_FILL: Record<string, string> = {
  pending: "bg-wait",
  preparing: "bg-cook",
  served: "bg-done",
};
const STEP_TEXT: Record<string, string> = {
  pending: "text-wait",
  preparing: "text-cook",
  served: "text-done",
};

export default function TableClientPage({ tableId }: TableClientPageProps) {
  const {
    menu,
    categories,
    clientOrders,
    placeOrder,
    fetchTableDetails,
    refreshClientOrders,
  } = useRestaurant();

  // Local table state
  const [tableNumber, setTableNumber] = useState<string>("...");
  const [tableStatus, setTableStatus] = useState<string>("active");

  // Local state controls
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);
  const [activeTab, setActiveTab] = useState<"menu" | "orders">("menu");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Load Table Details and Poll Client Placed Orders
  useEffect(() => {
    async function loadTable() {
      const info = await fetchTableDetails(tableId);
      if (info) {
        setTableNumber(info.number);
        setTableStatus(info.status);
        localStorage.setItem("k_active_table", tableId);
      }
    }
    loadTable();

    // Initial fetch of orders
    refreshClientOrders(tableId);

    // Poll orders status every 5 seconds
    const interval = setInterval(() => {
      refreshClientOrders(tableId);
    }, 5000);
    return () => clearInterval(interval);
  }, [tableId]);

  // Filtering menu by category id
  const filteredMenu = menu.filter((item) => {
    if (selectedCategory === "all") return true;
    return item.categoryId === selectedCategory;
  });

  // When nothing is filtered the list reads like the board on the wall:
  // one block per section of the menu.
  const sections =
    selectedCategory === "all"
      ? [
          ...categories
            .map((c) => ({
              id: c.id,
              name: c.name,
              items: menu.filter((m) => m.categoryId === c.id),
            }))
            .filter((s) => s.items.length > 0),
          {
            id: "other",
            name: "อื่น ๆ",
            items: menu.filter(
              (m) => !categories.some((c) => c.id === m.categoryId)
            ),
          },
        ].filter((s) => s.items.length > 0)
      : [
          {
            id: selectedCategory,
            name:
              categories.find((c) => c.id === selectedCategory)?.name ?? "เมนู",
            items: filteredMenu,
          },
        ];

  const handleOpenDetailModal = (item: MenuItem) => {
    if (!item.available) return;
    setSelectedItem(item);
    setItemQuantity(1);
    setItemNotes("");
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;
    const existingIndex = cart.findIndex(
      (c) => c.menuItem.id === selectedItem.id && c.specialNotes === itemNotes
    );

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += itemQuantity;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          menuItem: selectedItem,
          quantity: itemQuantity,
          specialNotes: itemNotes,
        },
      ]);
    }

    setSelectedItem(null);
  };

  const handleUpdateCartQuantity = (index: number, change: number) => {
    const updated = [...cart];
    const newQty = updated[index].quantity + change;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
    }
    setCart(updated);
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    const success = await placeOrder(tableId, cart);
    if (success) {
      setCart([]);
      setIsCartOpen(false);
      setIsOrderPlaced(true);
      setActiveTab("orders");
      setTimeout(() => {
        setIsOrderPlaced(false);
      }, 4000);
    } else {
      alert("ส่งออเดอร์ไม่สำเร็จ ลองอีกครั้ง หรือเรียกพนักงานที่โต๊ะ");
    }
  };

  const handleLeaveTable = () => {
    localStorage.removeItem("k_active_table");
    window.location.href = "/";
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Flat map backend clientOrders to flat list of unpaid order items for presentation in history list
  const activeOrders = clientOrders
    .filter(
      (order) =>
        order.status !== "completed" &&
        order.status !== "cancelled" &&
        order.paymentStatus !== "paid"
    )
    .flatMap((order) =>
      order.items.map((item, idx) => {
        const matchedMenuItem = menu.find((m) => m.id === item.menuItemId);
        return {
          id: `${order._id}_${idx}`,
          menuItem: {
            id: item.menuItemId,
            name: item.name,
            price: item.price,
            emoji: matchedMenuItem?.emoji || "🍳",
            imageUrl: matchedMenuItem?.imageUrl,
            koreanName: matchedMenuItem?.koreanName || "",
          },
          quantity: item.quantity,
          specialNotes: item.specialInstructions,
          status: order.status,
          timestamp: new Date(order.createdAt).toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      })
    );

  const activeOrdersTotal = activeOrders.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );

  const thumb = (
    src: string | undefined,
    emoji: string,
    size: string,
    text: string
  ) => (
    <span
      className={`relative flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-tile border border-edge bg-shell ${text}`}
    >
      {src ? (
        // backend-hosted upload, outside next/image's optimiser
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{emoji}</span>
      )}
    </span>
  );

  return (
    <div className="flex min-h-screen flex-col bg-brand-bg pb-24">
      {/* Top bar: who you are and which table you are sitting at */}
      <header className="sticky top-0 z-40 w-full bg-brand-bg/95 backdrop-blur">
        <div className="awning" />
        <div className="flex items-center justify-between gap-3 border-b border-edge px-4 py-2.5">
          <span className="flex items-center gap-2.5">
            <span className="relative h-9 w-9 overflow-hidden rounded-tile border border-edge">
              <Image
                src="/ramyone.jpg"
                alt=""
                fill
                sizes="36px"
                className="object-cover"
              />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[0.625rem] font-medium text-primary">
                라면 언니
              </span>
              <span className="font-display mt-1 text-base font-bold tracking-tight">
                รามยอนออนนี่
              </span>
            </span>
          </span>

          <div className="relative flex items-center gap-2">
            <span className="font-display flex items-center gap-2 rounded-tile border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary-dark">
              <span className="live-dot text-primary" />
              โต๊ะ {tableNumber}
            </span>

            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="ตัวเลือกเพิ่มเติม"
              aria-expanded={isMenuOpen}
              className="btn btn-plain btn-sm px-2.5"
            >
              <Icon name="more" size={18} />
            </button>

            {isMenuOpen && (
              <div className="panel animate-pop absolute right-0 top-12 z-50 w-52 p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={handleLeaveTable}
                  className="btn btn-quiet w-full justify-start text-sm"
                >
                  <Icon name="logout" size={16} />
                  ออกจากโต๊ะนี้
                </button>
                <p className="px-3 pb-1.5 pt-1 text-xs leading-relaxed text-ink-faint">
                  ใช้เมื่อคุณลุกจากโต๊ะแล้ว ออเดอร์ที่สั่งไปยังอยู่กับทางร้าน
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Menu or the state of what you already asked for */}
        <div className="flex border-b border-edge bg-brand-bg">
          {(
            [
              ["menu", "เมนู"],
              ["orders", `ออเดอร์ของโต๊ะ${activeOrders.length ? ` (${activeOrders.length})` : ""}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              aria-current={activeTab === key}
              className={`font-display relative flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === key ? "text-primary" : "text-ink-soft"
              }`}
            >
              {label}
              <span
                className={`absolute inset-x-0 bottom-0 h-0.5 ${
                  activeTab === key ? "bg-primary" : "bg-transparent"
                }`}
              />
            </button>
          ))}
        </div>
      </header>

      {activeTab === "menu" ? (
        <div className="mx-auto w-full max-w-lg flex-1">
          {/* What the kitchen wants you to know before you choose */}
          <p className="flex items-center gap-2.5 border-b border-edge bg-shell px-4 py-2.5 text-xs text-ink-soft">
            <Icon name="bowl" size={16} className="text-primary" />
            เส้นลวกทีละชาม น้ำซุปเคี่ยวใหม่ทุกเช้า
          </p>

          {/* Sections of the board */}
          <div className="rail sticky top-[6.9rem] z-30 gap-1 border-b border-edge bg-brand-bg px-3">
            {[{ id: "all", name: "ทั้งหมด" }, ...categories].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`font-display relative shrink-0 px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? "text-ink"
                    : "text-ink-faint hover:text-ink-soft"
                }`}
              >
                {cat.name}
                {selectedCategory === cat.id && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>

          <div className="px-4 pb-8">
            {sections.map((section) => (
              <section key={section.id} className="pt-6">
                <div className="mb-1 flex items-baseline gap-3">
                  <h2 className="font-display text-lg font-bold tracking-tight">
                    {section.name}
                  </h2>
                  <span className="leader" />
                  <span className="text-xs text-ink-faint">
                    {section.items.length} รายการ
                  </span>
                </div>

                <ul>
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleOpenDetailModal(item)}
                        disabled={!item.available}
                        className={`flex w-full items-start gap-3 border-b border-edge-soft py-3.5 text-left transition-colors ${
                          item.available
                            ? "hover:bg-shell/70"
                            : "cursor-not-allowed opacity-55"
                        }`}
                      >
                        {thumb(
                          item.imageUrl,
                          item.emoji,
                          "h-14 w-14",
                          "text-2xl"
                        )}

                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className="font-display text-base font-semibold leading-snug">
                              {item.name}
                            </span>
                            <span className="leader" />
                            <span className="font-display shrink-0 text-base font-bold text-primary-dark tabular-nums">
                              {item.price}
                              <span className="ml-0.5 text-xs font-semibold text-ink-faint">
                                ฿
                              </span>
                            </span>
                          </span>

                          {item.koreanName && (
                            <span className="mt-0.5 block text-xs text-ink-faint">
                              {item.koreanName}
                            </span>
                          )}

                          {item.description && (
                            <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-ink-soft">
                              {item.description}
                            </span>
                          )}

                          {!item.available && (
                            <span className="mark mark-off mt-2">
                              หมดแล้ววันนี้
                            </span>
                          )}
                        </span>

                        {item.available && (
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-tile border border-edge text-ink-soft">
                            <Icon name="plus" size={16} />
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {menu.length === 0 && (
              <p className="py-20 text-center text-sm text-ink-soft">
                ยังโหลดเมนูไม่ขึ้น ลองดึงหน้าจอลงเพื่อโหลดใหม่อีกครั้ง
              </p>
            )}
          </div>
        </div>
      ) : (
        /* What you already asked for, and how far along it is */
        <div className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
          {activeOrders.length === 0 ? (
            <div className="panel-sunk px-6 py-14 text-center">
              <h2 className="font-display text-lg font-bold">
                โต๊ะนี้ยังไม่ได้สั่งอะไร
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
                เลือกจากเมนูได้เลย ทุกจานที่สั่งจะมาอยู่ตรงนี้
                พร้อมบอกว่าครัวทำถึงไหนแล้ว
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("menu")}
                className="btn btn-red mt-6"
              >
                ดูเมนู
              </button>
            </div>
          ) : (
            <div className="panel overflow-hidden">
              <ul className="divide-y divide-edge-soft">
                {activeOrders.map((ord) => {
                  const stepIndex = STEPS.indexOf(
                    ord.status as (typeof STEPS)[number]
                  );

                  return (
                    <li key={ord.id} className="flex gap-3 p-4">
                      {thumb(
                        ord.menuItem.imageUrl,
                        ord.menuItem.emoji,
                        "h-12 w-12",
                        "text-xl"
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <h3 className="font-display text-base font-semibold">
                            {ord.menuItem.name}
                          </h3>
                          <span className="text-sm text-ink-soft tabular-nums">
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

                        {ord.specialNotes && (
                          <p className="mt-1.5 flex items-start gap-1.5 rounded-chit bg-wait-tint px-2 py-1.5 text-xs leading-relaxed text-wait">
                            <Icon name="note" size={13} className="mt-px" />
                            {ord.specialNotes}
                          </p>
                        )}

                        {/* three beats, because that is what the kitchen does */}
                        <div className="mt-2.5 flex items-center gap-2">
                          <span className="flex gap-1" aria-hidden="true">
                            {STEPS.map((s, i) => (
                              <span
                                key={s}
                                className={`h-1 w-7 rounded-full ${
                                  i <= stepIndex && stepIndex >= 0
                                    ? STEP_FILL[ord.status]
                                    : "bg-edge"
                                }`}
                              />
                            ))}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              STEP_TEXT[ord.status] ?? "text-ink-soft"
                            }`}
                          >
                            {STEP_LABEL[ord.status] ?? "รอครัวยืนยัน"}
                          </span>
                        </div>

                        <p className="mt-1.5 text-xs text-ink-faint">
                          สั่งเมื่อ {ord.timestamp} น.
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-edge bg-shell px-4 py-4">
                <div className="flex items-baseline gap-3">
                  <p className="font-display font-semibold">ยอดรวมของโต๊ะ</p>
                  <span className="leader" />
                  <span className="font-display text-2xl font-bold text-primary-dark tabular-nums">
                    {activeOrdersTotal.toLocaleString("th-TH")}
                    <span className="ml-1 text-base font-semibold text-ink-faint">
                      ฿
                    </span>
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-ink-faint">
                  จ่ายทีเดียวที่เคาน์เตอร์ตอนกลับ
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cart handle, only while there is something in it */}
      {cart.length > 0 && activeTab === "menu" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-primary-dark/20 bg-brand-bg/80 p-3 backdrop-blur">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="btn btn-red mx-auto flex w-full max-w-lg justify-between px-4 py-3.5"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-chit bg-accent text-sm font-bold text-ink tabular-nums">
                {cartItemCount}
              </span>
              ดูตะกร้า
            </span>
            <span className="text-base tabular-nums">{cartTotal} ฿</span>
          </button>
        </div>
      )}

      {/* The one orchestrated moment in the whole app: the order gets stamped */}
      {isOrderPlaced && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div className="animate-stamp flex flex-col items-center gap-2 rounded-panel border-4 border-done bg-brand-bg/95 px-10 py-8 text-done shadow-xl">
            <Icon name="check" size={40} strokeWidth={2.4} />
            <p className="font-display text-xl font-bold">ส่งเข้าครัวแล้ว</p>
            <p className="text-sm text-ink-soft">ดูความคืบหน้าได้ที่แท็บออเดอร์</p>
          </div>
        </div>
      )}

      {/* Dish sheet */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="animate-veil absolute inset-0 bg-ink/50"
            onClick={() => setSelectedItem(null)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedItem.name}
            className="animate-sheet relative z-10 flex max-h-[92vh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-t-panel bg-brand-bg p-5 pb-7"
          >
            <div className="flex items-start gap-4">
              {thumb(
                selectedItem.imageUrl,
                selectedItem.emoji,
                "h-24 w-24",
                "text-5xl"
              )}

              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl font-bold leading-tight">
                  {selectedItem.name}
                </h2>
                {selectedItem.koreanName && (
                  <p className="mt-1 text-sm text-ink-faint">
                    {selectedItem.koreanName}
                  </p>
                )}
                <p className="mt-1 text-xs text-ink-faint">
                  {selectedItem.categoryName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                aria-label="ปิด"
                className="btn btn-quiet -mt-1 -mr-1 px-2 py-2"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {selectedItem.description && (
              <p className="text-sm leading-relaxed text-ink-soft">
                {selectedItem.description}
              </p>
            )}

            <div className="flex items-baseline gap-3 border-t border-edge pt-3">
              <span className="text-sm text-ink-soft">ราคาต่อจาน</span>
              <span className="leader" />
              <span className="font-display text-xl font-bold text-primary-dark tabular-nums">
                {selectedItem.price}
                <span className="ml-0.5 text-sm font-semibold text-ink-faint">
                  ฿
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between border-y border-edge py-3">
              <span className="font-display font-semibold">จำนวน</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                  aria-label="ลดจำนวน"
                  disabled={itemQuantity <= 1}
                  className="btn btn-plain h-11 w-11 p-0"
                >
                  <Icon name="minus" size={18} />
                </button>
                <output className="font-display w-12 text-center text-lg font-bold">
                  {itemQuantity}
                </output>
                <button
                  type="button"
                  onClick={() => setItemQuantity(itemQuantity + 1)}
                  aria-label="เพิ่มจำนวน"
                  className="btn btn-plain h-11 w-11 p-0"
                >
                  <Icon name="plus" size={18} />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="field-label flex justify-between">
                <span>บอกครัวเพิ่มเติม เช่น ไม่เผ็ด ไม่ใส่ผัก</span>
                <span className="text-ink-faint tabular-nums">
                  {itemNotes.length}/200
                </span>
              </label>
              <textarea
                id="notes"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={2}
                placeholder="ไม่ระบุก็ได้"
                className="field resize-none"
              />
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              className="btn btn-red btn-lg w-full justify-between"
            >
              ใส่ตะกร้า
              <span className="tabular-nums">
                {selectedItem.price * itemQuantity} ฿
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Cart sheet */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="animate-veil absolute inset-0 bg-ink/50"
            onClick={() => setIsCartOpen(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="ตะกร้า"
            className="animate-sheet relative z-10 flex max-h-[85vh] w-full max-w-md flex-col rounded-t-panel bg-brand-bg"
          >
            <div className="flex items-center justify-between border-b border-edge px-5 py-4">
              <h2 className="font-display text-lg font-bold">
                ตะกร้าของโต๊ะ {tableNumber}
              </h2>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                aria-label="ปิด"
                className="btn btn-quiet px-2 py-2"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <ul className="flex-1 divide-y divide-edge-soft overflow-y-auto px-5">
              {cart.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 py-4">
                  {thumb(
                    item.menuItem.imageUrl,
                    item.menuItem.emoji,
                    "h-12 w-12",
                    "text-xl"
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-display truncate font-semibold">
                        {item.menuItem.name}
                      </h3>
                      <span className="leader" />
                      <span className="font-display shrink-0 font-semibold tabular-nums">
                        {item.menuItem.price * item.quantity}
                        <span className="ml-0.5 text-xs font-semibold text-ink-faint">
                          ฿
                        </span>
                      </span>
                    </div>

                    {item.specialNotes && (
                      <p className="mt-1.5 flex items-start gap-1.5 rounded-chit bg-wait-tint px-2 py-1.5 text-xs leading-relaxed text-wait">
                        <Icon name="note" size={13} className="mt-px" />
                        {item.specialNotes}
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateCartQuantity(idx, -1)}
                        aria-label={
                          item.quantity === 1
                            ? `เอา ${item.menuItem.name} ออก`
                            : `ลดจำนวน ${item.menuItem.name}`
                        }
                        className="btn btn-plain h-9 w-9 p-0"
                      >
                        <Icon
                          name={item.quantity === 1 ? "trash" : "minus"}
                          size={15}
                        />
                      </button>
                      <output className="font-display w-9 text-center font-bold">
                        {item.quantity}
                      </output>
                      <button
                        type="button"
                        onClick={() => handleUpdateCartQuantity(idx, 1)}
                        aria-label={`เพิ่มจำนวน ${item.menuItem.name}`}
                        className="btn btn-plain h-9 w-9 p-0"
                      >
                        <Icon name="plus" size={15} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-edge bg-shell px-5 py-4">
              <div className="flex items-baseline gap-3">
                <span className="font-display font-semibold">ยอดรอบนี้</span>
                <span className="leader" />
                <span className="font-display text-2xl font-bold text-primary-dark tabular-nums">
                  {cartTotal} ฿
                </span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                กดส่งแล้วครัวเริ่มทำทันที ถ้าต้องแก้ไขให้เรียกพนักงานที่โต๊ะ
              </p>

              <button
                type="button"
                onClick={handleSubmitOrder}
                className="btn btn-red btn-lg mt-3 w-full"
              >
                ส่งออเดอร์เข้าครัว
              </button>
            </div>
          </div>
        </div>
      )}

      {tableStatus === "inactive" && (
        <p className="fixed inset-x-4 bottom-24 z-30 mx-auto max-w-lg rounded-tile border border-primary/30 bg-primary/5 px-4 py-3 text-center text-sm text-primary-dark">
          โต๊ะนี้ถูกปิดการใช้งานอยู่ เรียกพนักงานเพื่อเปิดโต๊ะก่อนสั่ง
        </p>
      )}
    </div>
  );
}
