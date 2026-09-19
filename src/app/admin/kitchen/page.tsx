"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRestaurant, BackendOrder } from "@/context/RestaurantContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminBar from "@/components/AdminBar";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import Confirm from "@/components/Confirm";
import { buzz, playChime, unlockAudio } from "@/lib/alert";

interface KdsItem {
  key: string; // `${orderId}_${itemIndex}`
  orderId: string;
  itemIndex: number;
  name: string;
  quantity: number;
  specialInstructions: string;
  tableNumber: string;
  status: "pending" | "preparing" | "served" | "completed" | "cancelled";
  createdAt: string;
}

/** A dish is late once it has sat on the rail this long. */
const LATE_MINUTES = 15;
const WARM_MINUTES = 8;

export default function KitchenDisplay() {
  const {
    restaurant,
    adminToken,
    adminUser,
    updateOrderStatus,
    logout,
    customFetch,
  } = useRestaurant();
  const router = useRouter();
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  // Local track of done items for order-level integration
  const [doneItemKeys, setDoneItemKeys] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<KdsItem | null>(null);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);

  // Ticker state to force refresh time elapsed counters every second
  const [, setTicker] = useState(0);

  // Keep track of previously loaded active order item keys to detect new items for chime sound
  const previousItemKeysRef = useRef<string[]>([]);

  const [clearedItemKeys, setClearedItemKeys] = useState<string[]>([]);

  // Load state and doneItemKeys from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("kds_done_item_keys");
      if (stored) {
        try {
          setDoneItemKeys(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse kds_done_item_keys", e);
        }
      }
      const storedCleared = localStorage.getItem("kds_cleared_item_keys");
      if (storedCleared) {
        try {
          setClearedItemKeys(JSON.parse(storedCleared));
        } catch (e) {
          console.error("Failed to parse kds_cleared_item_keys", e);
        }
      }
      const soundPref = localStorage.getItem("kds_sound_enabled");
      if (soundPref !== null) {
        setIsSoundEnabled(soundPref === "true");
      }
    }
  }, []);

  // Save doneItemKeys to localStorage
  const saveDoneKeys = (keys: string[]) => {
    setDoneItemKeys(keys);
    localStorage.setItem("kds_done_item_keys", JSON.stringify(keys));
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!adminToken) {
      router.push("/admin/login");
    } else {
      setLoading(false);
    }
  }, [adminToken, router]);

  // Fetch orders function
  const fetchOrders = async () => {
    if (!restaurant || !adminToken) return;
    try {
      const res = await customFetch(
        `${API_URL}/orders/restaurant/${restaurant._id}`
      );
      if (!res.ok) {
        if (res.status === 401) {
          logout();
          router.push("/admin/login");
        }
        return;
      }
      const data: BackendOrder[] = await res.json();
      setOrders(data);

      // Extract current active item keys (pending or preparing, and not locally marked as done)
      const currentActiveKeys: string[] = [];
      data.forEach((o) => {
        if (["pending", "preparing"].includes(o.status)) {
          o.items.forEach((_, idx) => {
            currentActiveKeys.push(`${o._id}_${idx}`);
          });
        }
      });

      // Find if there are any new items that weren't in previous fetch
      const previousKeys = previousItemKeysRef.current;
      const hasNewItems = currentActiveKeys.some(
        (k) => !previousKeys.includes(k)
      );

      if (hasNewItems && previousKeys.length > 0) {
        if (isSoundEnabled) playChime();
        buzz();
      }

      previousItemKeysRef.current = currentActiveKeys;
    } catch (err) {
      console.error("Failed to fetch KDS orders:", err);
    }
  };

  // Timer to fetch orders periodically (every 5 seconds)
  useEffect(() => {
    if (restaurant && adminToken) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [restaurant, adminToken]);

  // Timer ticker to update the age of every chit once a second
  useEffect(() => {
    const tickerInterval = setInterval(() => {
      setTicker((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(tickerInterval);
  }, []);

  // Process and compile KdsItems list
  const activeKdsItems: KdsItem[] = [];
  const historyKdsItems: KdsItem[] = [];

  orders.forEach((o) => {
    const isOrderActive = ["pending", "preparing"].includes(o.status);
    const tableNum =
      typeof o.tableId === "object" && o.tableId ? o.tableId.number : "??";

    o.items.forEach((item, idx) => {
      const key = `${o._id}_${idx}`;
      const isItemDone = doneItemKeys.includes(key);

      const kdsItem: KdsItem = {
        key,
        orderId: o._id,
        itemIndex: idx,
        name: item.name,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions || "",
        tableNumber: tableNum,
        status: o.status,
        createdAt: o.createdAt,
      };

      if (isOrderActive && !isItemDone) {
        activeKdsItems.push(kdsItem);
      } else if (o.status === "served" || (isOrderActive && isItemDone)) {
        if (!clearedItemKeys.includes(key)) {
          historyKdsItems.push(kdsItem);
        }
      }
    });
  });

  // Oldest first: the rail is worked from the far end
  activeKdsItems.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  historyKdsItems.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const lateCount = activeKdsItems.filter(
    (i) => age(i.createdAt).minutes >= LATE_MINUTES
  ).length;

  // Action: Start cooking (Set order status to preparing)
  const handleStartCooking = async (orderId: string) => {
    const orderObj = orders.find((o) => o._id === orderId);
    if (orderObj && orderObj.status === "pending") {
      await updateOrderStatus(orderId, "preparing");
      fetchOrders();
    }
  };

  // Action: Mark dish as completed/done
  const handleMarkItemDone = async (kdsItem: KdsItem) => {
    const newDoneKeys = [...doneItemKeys, kdsItem.key];
    saveDoneKeys(newDoneKeys);

    const parentOrder = orders.find((o) => o._id === kdsItem.orderId);
    if (parentOrder) {
      const allItemsDone = parentOrder.items.every((_, idx) =>
        newDoneKeys.includes(`${parentOrder._id}_${idx}`)
      );

      if (allItemsDone) {
        // The whole ticket is away: the backend order follows
        await updateOrderStatus(parentOrder._id, "served");
        const cleanedKeys = newDoneKeys.filter(
          (k) =>
            !parentOrder.items.some((_, idx) => `${parentOrder._id}_${idx}` === k)
        );
        saveDoneKeys(cleanedKeys);
      }
      fetchOrders();
    }
  };

  // Action: Recall completed item back to active cooking list
  const handleRecallItem = async (kdsItem: KdsItem) => {
    const parentOrder = orders.find((o) => o._id === kdsItem.orderId);

    if (parentOrder && parentOrder.status === "served") {
      const reDoneKeys = [...doneItemKeys];
      parentOrder.items.forEach((_, idx) => {
        if (idx !== kdsItem.itemIndex) {
          reDoneKeys.push(`${parentOrder._id}_${idx}`);
        }
      });
      saveDoneKeys(reDoneKeys);
      await updateOrderStatus(parentOrder._id, "preparing");
    } else {
      saveDoneKeys(doneItemKeys.filter((k) => k !== kdsItem.key));
    }
    fetchOrders();
  };

  const handleClearItemHistory = (key: string) => {
    const newCleared = [...clearedItemKeys, key];
    setClearedItemKeys(newCleared);
    localStorage.setItem("kds_cleared_item_keys", JSON.stringify(newCleared));
  };

  const handleClearAllHistory = () => {
    const keysToClear = historyKdsItems.map((item) => item.key);
    const newCleared = Array.from(new Set([...clearedItemKeys, ...keysToClear]));
    setClearedItemKeys(newCleared);
    localStorage.setItem("kds_cleared_item_keys", JSON.stringify(newCleared));
    setIsClearAllOpen(false);
  };

  const toggleSound = () => {
    const newValue = !isSoundEnabled;
    setIsSoundEnabled(newValue);
    localStorage.setItem("kds_sound_enabled", String(newValue));
    // The tap itself is what lets the browser play audio later on.
    if (newValue) {
      unlockAudio();
      playChime();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kds">
        <div className="flex flex-col items-center gap-3 text-kds-mute">
          <span className="spinner h-8 w-8 text-accent" />
          <p className="text-sm">กำลังเปิดจอครัว</p>
        </div>
      </div>
    );
  }

  const list = activeTab === "active" ? activeKdsItems : historyKdsItems;

  return (
    <div className="flex min-h-screen flex-col bg-kds text-kds-text select-none">
      <AdminBar
        room="ห้องครัว"
        user={adminUser}
        onLogout={logout}
        apiUrl={API_URL}
        lead={
          <Link href="/admin" className="btn btn-dark-quiet btn-sm">
            <Icon name="back" size={16} />
            <span className="hidden sm:inline">แดชบอร์ด</span>
          </Link>
        }
        items={[{ kind: "link", href: "/admin/menu", label: "เมนู", icon: "bowl" }]}
      />

      {/* The rail lip: what is on, what is away, and how loud the room is */}
      <div className="sticky top-0 z-30 border-b border-kds-edge bg-kds-panel">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 md:px-6">
          <div className="rail -mx-1 gap-1 px-1">
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`tab tab-dark ${activeTab === "active" ? "tab-on" : ""}`}
            >
              ค้างปรุง
              <span className="tabular-nums opacity-70">
                {activeKdsItems.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`tab tab-dark ${activeTab === "history" ? "tab-on" : ""}`}
            >
              ทำเสร็จแล้ว
              <span className="tabular-nums opacity-70">
                {historyKdsItems.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 py-2">
            {lateCount > 0 && activeTab === "active" && (
              <span className="mark border-primary/50 bg-primary/15 text-[#ff8f8a]">
                เกิน {LATE_MINUTES} นาที {lateCount} จาน
              </span>
            )}

            {activeTab === "history" && historyKdsItems.length > 0 && (
              <button
                type="button"
                onClick={() => setIsClearAllOpen(true)}
                className="btn btn-dark-quiet btn-sm"
              >
                <Icon name="trash" size={15} />
                ล้างรายการที่เสร็จแล้ว
              </button>
            )}

            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={isSoundEnabled}
              className={`btn btn-sm ${
                isSoundEnabled ? "btn-dark" : "btn-dark-quiet"
              }`}
            >
              <Icon name={isSoundEnabled ? "bell" : "bellOff"} size={16} />
              {isSoundEnabled ? "เสียงเตือนเปิด" : "เสียงเตือนปิด"}
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-6">
        {list.length === 0 ? (
          <div className="mx-auto max-w-sm py-24 text-center">
            <h2 className="font-display text-xl font-bold">
              {activeTab === "active" ? "รางว่าง ไม่มีจานค้าง" : "ยังไม่มีจานที่ทำเสร็จ"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-kds-mute">
              {activeTab === "active"
                ? "ออเดอร์ใหม่จะเด้งขึ้นตรงนี้เองพร้อมเสียงเตือน ไม่ต้องรีเฟรชหน้าจอ"
                : "จานที่กดว่าทำเสร็จแล้วจะย้ายมาเก็บที่นี่ เผื่อต้องเรียกกลับไปทำใหม่"}
            </p>
            {activeTab === "history" && (
              <button
                type="button"
                onClick={() => setActiveTab("active")}
                className="btn btn-dark mt-6"
              >
                ดูจานที่ค้างอยู่
              </button>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {list.map((item) =>
              activeTab === "active" ? (
                <ActiveChit
                  key={item.key}
                  item={item}
                  onOpen={() => setSelectedItem(item)}
                  onStart={() => handleStartCooking(item.orderId)}
                  onDone={() => handleMarkItemDone(item)}
                />
              ) : (
                <DoneChit
                  key={item.key}
                  item={item}
                  onOpen={() => setSelectedItem(item)}
                  onRecall={() => handleRecallItem(item)}
                  onClear={() => handleClearItemHistory(item.key)}
                />
              )
            )}
          </ul>
        )}
      </main>

      {/* Read at arm's length, hands full: one dish, set as large as it fits */}
      {selectedItem && (
        <Modal
          tone="dark"
          width="max-w-2xl"
          title={`โต๊ะ ${selectedItem.tableNumber}`}
          note={`สั่งเมื่อ ${new Date(selectedItem.createdAt).toLocaleTimeString(
            "th-TH",
            { hour: "2-digit", minute: "2-digit" }
          )} น. รออยู่ ${age(selectedItem.createdAt).text}`}
          onClose={() => setSelectedItem(null)}
        >
          <div className="flex items-start justify-between gap-6">
            <h3 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
              {selectedItem.name}
            </h3>
            <span className="font-display shrink-0 text-5xl font-bold tabular-nums sm:text-6xl">
              ×{selectedItem.quantity}
            </span>
          </div>

          {selectedItem.specialInstructions ? (
            <div className="slip mt-6 flex items-start gap-3 p-4">
              <Icon name="note" size={22} className="mt-1 shrink-0" />
              <p className="font-display text-2xl font-semibold leading-snug sm:text-3xl">
                {selectedItem.specialInstructions}
              </p>
            </div>
          ) : (
            <p className="mt-6 text-sm text-kds-mute">
              ลูกค้าไม่ได้สั่งอะไรเป็นพิเศษ ทำตามสูตรปกติได้เลย
            </p>
          )}

          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            {activeTab === "active" ? (
              selectedItem.status === "pending" ? (
                <button
                  type="button"
                  onClick={() => {
                    handleStartCooking(selectedItem.orderId);
                    setSelectedItem(null);
                  }}
                  className="btn btn-dark btn-lg flex-1"
                >
                  <Icon name="flame" size={18} />
                  เริ่มปรุงจานนี้
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleMarkItemDone(selectedItem);
                    setSelectedItem(null);
                  }}
                  className="btn btn-go btn-lg flex-1"
                >
                  <Icon name="check" size={18} />
                  ทำเสร็จแล้ว ยกออกได้
                </button>
              )
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    handleRecallItem(selectedItem);
                    setSelectedItem(null);
                  }}
                  className="btn btn-dark btn-lg flex-1"
                >
                  <Icon name="undo" size={18} />
                  เรียกกลับมาทำใหม่
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleClearItemHistory(selectedItem.key);
                    setSelectedItem(null);
                  }}
                  className="btn btn-dark-quiet btn-lg"
                >
                  <Icon name="trash" size={17} />
                  ล้างออกจากจอ
                </button>
              </>
            )}
          </div>
        </Modal>
      )}

      {isClearAllOpen && (
        <Confirm
          title="ล้างรายการที่ทำเสร็จแล้ว"
          body={`จะเอา ${historyKdsItems.length} จานออกจากจอนี้เท่านั้น ออเดอร์และบิลยังอยู่ครบในระบบ`}
          confirmLabel="ล้างออกจากจอ"
          onCancel={() => setIsClearAllOpen(false)}
          onConfirm={handleClearAllHistory}
        />
      )}
    </div>
  );
}

/** How long a dish has been on the rail, and how loudly to say so. */
function age(createdAtStr: string) {
  const diffMs = Date.now() - new Date(createdAtStr).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  const seconds = Math.max(0, Math.floor((diffMs % 60000) / 1000));

  return {
    minutes,
    seconds,
    text: minutes === 0 ? `${seconds} วินาที` : `${minutes} นาที`,
    // the column climbs for a quarter of an hour, then stays full
    fill: Math.min(100, (diffMs / (LATE_MINUTES * 60000)) * 100),
  };
}

/**
 * A dish still on the rail. Everything a cook needs from two metres away:
 * the table, the dish, how many, and a column down the left edge that fills
 * as it waits — the only thing on this screen that moves by itself.
 */
function ActiveChit({
  item,
  onOpen,
  onStart,
  onDone,
}: {
  item: KdsItem;
  onOpen: () => void;
  onStart: () => void;
  onDone: () => void;
}) {
  const a = age(item.createdAt);
  const late = a.minutes >= LATE_MINUTES;
  const warm = a.minutes >= WARM_MINUTES;
  const cooking = item.status === "preparing";

  return (
    <li
      className={`chit ${late ? "chit-late" : ""} ${
        late ? "age-late" : warm ? "age-warm" : ""
      }`}
    >
      <span className="age" aria-hidden="true">
        <span className="age-fill" style={{ height: `${a.fill}%` }} />
      </span>

      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 flex-col gap-3 pb-3 pl-5 pr-3 pt-3 text-left"
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-display text-lg font-bold">
            โต๊ะ {item.tableNumber}
          </span>
          <span
            className={`text-sm font-semibold tabular-nums ${
              late ? "text-primary" : "text-kds-mute"
            }`}
          >
            {a.text}
          </span>
        </span>

        <span className="flex flex-1 items-start justify-between gap-3">
          <span className="font-display text-xl font-bold leading-snug break-words">
            {item.name}
          </span>
          <span className="font-display shrink-0 text-3xl font-bold leading-none tabular-nums">
            ×{item.quantity}
          </span>
        </span>

        {item.specialInstructions && (
          <span className="slip flex items-start gap-1.5 px-2 py-1.5 text-sm font-semibold leading-snug">
            <Icon name="note" size={14} className="mt-0.5" />
            {item.specialInstructions}
          </span>
        )}
      </button>

      <div className="px-3 pb-3 pl-5">
        {cooking ? (
          <button type="button" onClick={onDone} className="btn btn-go w-full">
            <Icon name="check" size={16} />
            ทำเสร็จแล้ว
          </button>
        ) : (
          <button type="button" onClick={onStart} className="btn btn-dark w-full">
            <Icon name="flame" size={16} />
            เริ่มปรุง
          </button>
        )}
      </div>
    </li>
  );
}

/** A dish already away, kept only so it can be pulled back. */
function DoneChit({
  item,
  onOpen,
  onRecall,
  onClear,
}: {
  item: KdsItem;
  onOpen: () => void;
  onRecall: () => void;
  onClear: () => void;
}) {
  return (
    <li className="chit chit-done">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 flex-col gap-2 p-3 text-left"
      >
        <span className="flex items-baseline justify-between gap-2 text-kds-mute">
          <span className="font-display text-sm font-bold">
            โต๊ะ {item.tableNumber}
          </span>
          <span className="text-xs">
            {new Date(item.createdAt).toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            น.
          </span>
        </span>

        <span className="flex items-start justify-between gap-3">
          <span className="font-display text-base font-semibold leading-snug text-kds-mute line-through">
            {item.name}
          </span>
          <span className="font-display shrink-0 text-lg font-bold tabular-nums text-kds-mute">
            ×{item.quantity}
          </span>
        </span>
      </button>

      <div className="flex gap-2 p-3 pt-0">
        <button
          type="button"
          onClick={onRecall}
          className="btn btn-dark btn-sm flex-1"
        >
          <Icon name="undo" size={14} />
          เรียกกลับ
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label={`ล้าง ${item.name} ออกจากจอ`}
          className="btn btn-dark-quiet btn-sm px-2.5"
        >
          <Icon name="trash" size={14} />
        </button>
      </div>
    </li>
  );
}
