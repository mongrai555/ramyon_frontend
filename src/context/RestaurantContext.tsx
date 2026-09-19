"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import usePoll from "@/hooks/usePoll";

// Local types matching backend schemas
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryName: string; // resolved category name
  categoryId: string;
  imageGradient: string; // UI styling mapped from name
  emoji: string;         // UI styling mapped from name
  available: boolean;
  imageUrl?: string;
  koreanName?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialNotes: string;
}

export interface OrderItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  specialNotes: string;
  status: "pending" | "preparing" | "served" | "completed" | "cancelled";
  timestamp: string;
}

export interface TableState {
  tableId: string;
  number: string;
  status: "active" | "occupied" | "inactive";
  orders: OrderItem[];
  checkoutCompleted: boolean;
}

export interface BackendOrder {
  _id: string;
  restaurantId: string;
  tableId: { _id: string; number: string } | string;
  items: {
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
    specialInstructions: string;
  }[];
  totalPrice: number;
  status: "pending" | "preparing" | "served" | "completed" | "cancelled";
  paymentStatus: "pending" | "paid";
  paymentMethod: string;
  createdAt: string;
}

export interface BillItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Bill {
  id: string;
  restaurantId: string;
  tableId: string;
  tableNumber?: string;
  orderIds: string[];
  items: BillItem[];
  totalPrice: number;
  paymentMethod: 'cash' | 'promptpay' | 'credit_card';
  paymentStatus: 'pending' | 'paid';
  createdAt: string;
  cashierId?: string;
  cashierName?: string;
  cashierUsername?: string;
}

interface RestaurantContextType {
  restaurant: any | null;
  categories: Category[];
  menu: MenuItem[];
  tables: TableState[];
  adminToken: string | null;
  adminUser: any | null;
  clientOrders: BackendOrder[]; // customer's placed orders
  login: (username: string, passwordPlain: string) => Promise<boolean>;
  logout: () => void;
  placeOrder: (tableId: string, cartItems: CartItem[]) => Promise<boolean>;
  updateOrderStatus: (orderId: string, status: string) => Promise<boolean>;
  checkoutTable: (tableId: string, orderIds: string[], paymentMethod?: string) => Promise<boolean>;
  addMenuItem: (item: { name: string; description: string; price: number; categoryId: string; imageUrl?: string }) => Promise<boolean>;
  updateMenuItem: (id: string, item: { name?: string; description?: string; price?: number; categoryId?: string; imageUrl?: string; isAvailable?: boolean }) => Promise<boolean>;
  deleteMenuItem: (id: string) => Promise<boolean>;
  toggleMenuAvailability: (item: MenuItem) => Promise<boolean>;
  closeTableSession: (tableId: string) => Promise<boolean>;
  fetchTableDetails: (
    tableId: string
  ) => Promise<{
    number: string;
    status: string;
    sessionId?: string;
  } | null>;
  refreshClientOrders: (tableId: string) => Promise<void>;
  refreshAdminData: () => Promise<void>;
  getTableQrCode: (tableId: string) => Promise<string | null>;
  moveTable: (fromTableId: string, toTableId: string) => Promise<boolean>;
  addTable: (number: string) => Promise<boolean>;
  deleteTable: (tableId: string) => Promise<boolean>;
  uploadMenuItemImage: (file: File) => Promise<string | null>;
  bills: Bill[];
  refreshBills: () => Promise<void>;
  deleteBill: (id: string) => Promise<boolean>;
  deleteAllBills: () => Promise<boolean>;
  users: any[];
  refreshUsers: () => Promise<void>;
  addUser: (user: any) => Promise<boolean>;
  updateUser: (id: string, user: any) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  uploadUserAvatar: (file: File) => Promise<string | null>;
  customFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

// Styling Preset Mapper Helper
function getVisualPresets(name: string, categoryName: string = "") {
  const n = name.toLowerCase();
  const cat = categoryName.toLowerCase();
  
  if (n.includes("basil") || n.includes("kraprow") || n.includes("กะเพรา")) {
    return { emoji: "🍳", gradient: "from-amber-400 via-orange-500 to-red-600" };
  }
  if (n.includes("pad thai") || n.includes("shrimp") || n.includes("noodle") || n.includes("ผัดไทย")) {
    return { emoji: "🍜", gradient: "from-amber-500 to-red-500" };
  }
  if (n.includes("spring roll") || n.includes("crispy") || n.includes("เปาะเปี๊ยะ")) {
    return { emoji: "🥟", gradient: "from-amber-600 to-yellow-600" };
  }
  if (n.includes("tea") || n.includes("ชา")) {
    return { emoji: "🍵", gradient: "from-amber-300 to-amber-600" };
  }
  if (n.includes("coconut") || n.includes("water") || n.includes("มะพร้าว")) {
    return { emoji: "🥥", gradient: "from-sky-300 to-blue-500" };
  }
  if (n.includes("บิบิมบับ") || n.includes("bibimbap")) {
    return { emoji: "🍳", gradient: "from-amber-400 via-orange-500 to-red-600" };
  }
  if (n.includes("ซัมเกตัง") || n.includes("samgyetang")) {
    return { emoji: "🍲", gradient: "from-amber-100 to-yellow-300" };
  }
  if (n.includes("บูลโกกิ") || n.includes("bulgogi")) {
    return { emoji: "🥩", gradient: "from-rose-800 to-stone-900" };
  }
  if (n.includes("ต็อก") || n.includes("tteokbokki") || n.includes("ด็อกโบกกี")) {
    return { emoji: "🌶️", gradient: "from-red-500 to-orange-600" };
  }
  if (n.includes("กิมบับ") || n.includes("gimbap")) {
    return { emoji: "🍙", gradient: "from-emerald-800 via-stone-800 to-neutral-900" };
  }
  if (n.includes("ราเมน") || n.includes("ramyeon") || n.includes("รามยอน")) {
    return { emoji: "🍜", gradient: "from-amber-500 to-red-500" };
  }
  if (n.includes("บิงซู") || n.includes("bingsu")) {
    return { emoji: "🍧", gradient: "from-sky-200 via-pink-100 to-pink-300" };
  }
  if (n.includes("ฮอตต็อก") || n.includes("hotteok")) {
    return { emoji: "🥞", gradient: "from-amber-600 to-yellow-600" };
  }
  if (n.includes("ดัลโกนา") || n.includes("dalgona")) {
    return { emoji: "🍭", gradient: "from-yellow-500 to-orange-400" };
  }
  if (n.includes("ยัคซิก") || n.includes("yaksik")) {
    return { emoji: "🥮", gradient: "from-amber-800 to-stone-800" };
  }
  
  if (cat.includes("drink") || cat.includes("beverage") || cat.includes("เครื่องดื่ม")) {
    return { emoji: "🥤", gradient: "from-sky-300 to-blue-500" };
  }
  if (cat.includes("dessert") || cat.includes("ของหวาน")) {
    return { emoji: "🍧", gradient: "from-yellow-500 to-orange-400" };
  }
  
  return { emoji: "🍽️", gradient: "from-orange-500 to-red-600" };
}

function formatMenuItem(m: any, categoriesList: Category[], API_URL: string): MenuItem {
  const finalCategoryId = typeof m.category === 'object' && m.category 
    ? (m.category._id || m.category.id) 
    : (m.category || m.categoryId || "");
    
  const finalCategoryName = typeof m.category === 'object' && m.category 
    ? m.category.name 
    : (categoriesList.find((c: any) => c.id === finalCategoryId)?.name || "main");

  const presets = getVisualPresets(m.name, finalCategoryName);
  
  let finalImageUrl = m.imageUrl;
  if (finalImageUrl && finalImageUrl.startsWith("/uploads")) {
    const baseUrl = API_URL.replace("/api", "");
    finalImageUrl = `${baseUrl}${finalImageUrl}`;
  }

  return {
    id: m._id,
    name: m.name,
    description: m.description || "",
    price: m.price,
    categoryId: finalCategoryId,
    categoryName: finalCategoryName,
    emoji: presets.emoji,
    imageGradient: presets.gradient,
    available: m.isAvailable,
    imageUrl: finalImageUrl,
    koreanName: m.koreanName || undefined,
  };
}

export function RestaurantProvider({ children }: { children: React.ReactNode }) {
  const [restaurant, setRestaurant] = useState<any | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<TableState[]>([]);
  const [clientOrders, setClientOrders] = useState<BackendOrder[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
  const pathname = usePathname();

  // Route protection: automatically logout if navigating to customer (non-admin) routes
  useEffect(() => {
    if (pathname && !pathname.startsWith("/admin")) {
      const hasSession = typeof window !== 'undefined' ? sessionStorage.getItem("k_admin_token") : null;
      if (adminToken || hasSession) {
        logout();
      }
    }
  }, [pathname, adminToken]);

  // Bootstrap app data
  useEffect(() => {
    async function bootstrap() {
      try {
        // Load auth credentials if exist
        const token = typeof window !== 'undefined' ? sessionStorage.getItem("k_admin_token") : null;
        const user = typeof window !== 'undefined' ? sessionStorage.getItem("k_admin_user") : null;
        let parsedUser: any = null;
        if (token && user) {
          parsedUser = JSON.parse(user);
          setAdminToken(token);
          setAdminUser(parsedUser);
        }

        // 1. Fetch restaurants list
        const resRest = await fetch(`${API_URL}/restaurants`);
        if (!resRest.ok) throw new Error("Failed to fetch restaurants");
        const restaurants = await resRest.json();
        
        if (restaurants.length > 0) {
          const rest = restaurants[0]; // first seeded restaurant
          setRestaurant(rest);
          const restId = rest._id;

          // 2. Fetch categories
          const resCats = await fetch(`${API_URL}/categories/restaurant/${restId}`);
          if (resCats.ok) {
            const cats = await resCats.json();
            const formattedCats = cats.map((c: any) => ({
              id: c._id,
              name: c.name,
              description: c.description,
            }));
            setCategories(formattedCats);

            // 3. Fetch menu items
            const resMenu = await fetch(`${API_URL}/menu-items/restaurant/${restId}`);
            if (resMenu.ok) {
              const menuData = await resMenu.json();
              const formattedMenu = menuData.map((m: any) => formatMenuItem(m, formattedCats, API_URL));
              setMenu(formattedMenu);
            }
          }
        }
      } catch (err) {
        console.error("Restaurant bootstrap error:", err);
      } finally {
        setIsLoaded(true);
        const user = typeof window !== 'undefined' ? sessionStorage.getItem("k_admin_user") : null;
        if (user && JSON.parse(user).role === 'admin') {
          setTimeout(() => {
            refreshUsers();
          }, 200);
        }
      }
    }
    
    bootstrap();
  }, [API_URL]);

  // Auth login API
  const login = async (username: string, passwordPlain: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: passwordPlain }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      
      setAdminToken(data.access_token);
      setAdminUser(data.user);
      sessionStorage.setItem("k_admin_token", data.access_token);
      sessionStorage.setItem("k_admin_user", JSON.stringify(data.user));
      if (data.refresh_token) {
        localStorage.setItem("k_refresh_token", data.refresh_token);
      }
      
      // Load admin database states
      setTimeout(() => {
        refreshAdminData();
        refreshBills();
        if (data.user.role === 'admin') {
          refreshUsers();
        }
      }, 100);
      return true;
    } catch (err) {
      console.error("Login failed:", err);
      return false;
    }
  };

  const logout = () => {
    const token = adminToken || (typeof window !== 'undefined' ? sessionStorage.getItem("k_admin_token") : null);
    if (token) {
      fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch((err) => console.error("Backend logout error:", err));
    }
    setAdminToken(null);
    setAdminUser(null);
    sessionStorage.removeItem("k_admin_token");
    sessionStorage.removeItem("k_admin_user");
    if (typeof window !== 'undefined') {
      localStorage.removeItem("k_refresh_token");
    }
    setTables([]);
  };

  // Custom fetch wrapper with refresh token logic
  const customFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = adminToken || (typeof window !== 'undefined' ? sessionStorage.getItem("k_admin_token") : null);
    const headers = new Headers(options.headers || {});
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const finalOptions: RequestInit = {
      ...options,
      headers,
    };

    let res = await fetch(url, finalOptions);

    if (res.status === 401) {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem("k_refresh_token") : null;
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            setAdminToken(data.access_token);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem("k_admin_token", data.access_token);
              if (data.refresh_token) {
                localStorage.setItem("k_refresh_token", data.refresh_token);
              }
            }
            // Retry the original request with the new token
            headers.set("Authorization", `Bearer ${data.access_token}`);
            return fetch(url, { ...options, headers: headers });
          }
        } catch (err) {
          console.error("Token refresh failed:", err);
        }
      }
      logout();
      if (typeof window !== 'undefined') {
        window.location.href = "/admin/login";
      }
    }

    return res;
  };

  // Customer fetches current table number (public api)
  const fetchTableDetails = async (tableId: string) => {
    try {
      const res = await fetch(`${API_URL}/tables/${tableId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return {
        number: data.number,
        status: data.status,
        sessionId: data.sessionId as string | undefined,
      };
    } catch (err) {
      console.error("Fetch table details error:", err);
      return null;
    }
  };

  /**
   * Ends a seating by hand — the "ล้างโต๊ะ" button. Paying a bill does this on
   * the server already; this covers the party that walked out without ordering,
   * and it is what releases any phone still sitting on that table's menu.
   */
  const closeTableSession = async (tableId: string): Promise<boolean> => {
    try {
      const res = await customFetch(`${API_URL}/tables/${tableId}/close`, {
        method: "POST",
      });
      return res.ok;
    } catch (err) {
      console.error("Close table session error:", err);
      return false;
    }
  };

  // Admin fetches table QR code image (Base64)
  const getTableQrCode = async (tableId: string): Promise<string | null> => {
    try {
      const res = await customFetch(`${API_URL}/tables/${tableId}/qrcode`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.qrCodeImage;
    } catch (err) {
      console.error("Fetch table QR code error:", err);
      return null;
    }
  };

  // Customer places order API
  const placeOrder = async (tableId: string, cartItems: CartItem[]): Promise<boolean> => {
    if (!restaurant) return false;
    try {
      const itemsPayload = cartItems.map((c) => ({
        menuItemId: c.menuItem.id,
        quantity: c.quantity,
        specialInstructions: c.specialNotes,
      }));

      const res = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant._id,
          tableId,
          items: itemsPayload,
        }),
      });

      if (!res.ok) return false;
      const createdOrder = await res.json();

      // Add order ID to localStorage order history list for this table
      const storedOrders = localStorage.getItem(`placed_orders_${tableId}`);
      const list = storedOrders ? JSON.parse(storedOrders) : [];
      list.push(createdOrder._id);
      localStorage.setItem(`placed_orders_${tableId}`, JSON.stringify(list));

      // Refresh orders
      await refreshClientOrders(tableId);
      return true;
    } catch (err) {
      console.error("Place order failed:", err);
      return false;
    }
  };

  // Poll / refresh customer placed orders
  const refreshClientOrders = async (tableId: string) => {
    try {
      // 1. Fetch active orders for this table directly from backend
      const resActive = await fetch(`${API_URL}/orders/active/table/${tableId}`);
      let activeOrders: BackendOrder[] = [];
      if (resActive.ok) {
        activeOrders = await resActive.json();
      }

      // 2. Fetch other stored orders from localStorage (just in case they are completed/cancelled)
      const storedOrders = localStorage.getItem(`placed_orders_${tableId}`);
      const localIds: string[] = storedOrders ? JSON.parse(storedOrders) : [];
      
      // Combine them, avoiding duplicates
      const fetchedOrdersMap = new Map<string, BackendOrder>();
      activeOrders.forEach(o => fetchedOrdersMap.set(o._id, o));
      
      for (const orderId of localIds) {
        if (!fetchedOrdersMap.has(orderId)) {
          const res = await fetch(`${API_URL}/orders/${orderId}`);
          if (res.ok) {
            const ord = await res.json();
            fetchedOrdersMap.set(ord._id, ord);
          }
        }
      }
      
      setClientOrders(Array.from(fetchedOrdersMap.values()));
    } catch (err) {
      console.error("Refresh client orders failed:", err);
    }
  };

  // Admin refreshes dashboard data (tables + active orders)
  const refreshAdminData = async () => {
    const token = adminToken || (typeof window !== 'undefined' ? sessionStorage.getItem("k_admin_token") : null);
    if (!restaurant || !token) return;

    try {
      const restId = restaurant._id;
      
      // 1. Fetch all tables
      const resTables = await customFetch(`${API_URL}/tables/restaurant/${restId}`);
      if (!resTables.ok) return;
      const dbTables = await resTables.json();

      // 2. Fetch all orders
      const resOrders = await customFetch(`${API_URL}/orders/restaurant/${restId}`);
      if (!resOrders.ok) return;
      const allOrders: BackendOrder[] = await resOrders.json();

      // Mapped category names for menu details mapping
      const formattedCats = categories;

      // 3. Map orders and compile active table states
      const mappedTables: TableState[] = dbTables.map((tbl: any) => {
        // Find active orders for this table (pending, preparing, served)
        const tableOrders = allOrders.filter(
          (o) =>
            o.tableId && (typeof o.tableId === "object" ? o.tableId._id === tbl._id : o.tableId === tbl._id) &&
            ["pending", "preparing", "served"].includes(o.status)
        );

        // Map backend order items list to front-end OrderItem type
        const mappedOrderItems: OrderItem[] = [];
        tableOrders.forEach((o) => {
          o.items.forEach((item, idx) => {
            const presets = getVisualPresets(item.name);
            mappedOrderItems.push({
              id: `${o._id}_${idx}`, // unique id
              menuItem: {
                id: item.menuItemId,
                name: item.name,
                description: "",
                price: item.price,
                categoryId: "",
                categoryName: "",
                emoji: presets.emoji,
                imageGradient: presets.gradient,
                available: true,
              },
              quantity: item.quantity,
              specialNotes: item.specialInstructions,
              status: o.status, // mapped to aggregate order status
              timestamp: new Date(o.createdAt).toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            });
          });
        });

        return {
          tableId: tbl._id,
          number: tbl.number,
          status: tbl.status,
          orders: mappedOrderItems,
          checkoutCompleted: false,
        };
      });

      setTables(mappedTables);
      localStorage.setItem("k_cached_tables", JSON.stringify(mappedTables.map(t => ({ id: t.tableId, number: t.number }))));
    } catch (err) {
      console.error("Refresh admin dashboard failed:", err);
    }
  };

  // Kitchen/Admin updates an order item status
  const updateOrderStatus = async (orderId: string, status: string): Promise<boolean> => {
    try {
      const res = await customFetch(`${API_URL}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) return false;
      await refreshAdminData();
      return true;
    } catch (err) {
      console.error("Update order status failed:", err);
      return false;
    }
  };

  // Admin completes checkout for a table using backend bills checkout API
  const checkoutTable = async (tableId: string, orderIds: string[], paymentMethod?: string): Promise<boolean> => {
    try {
      const res = await customFetch(`${API_URL}/bills/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tableId,
          paymentMethod: paymentMethod || "cash",
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Checkout failed:", errorText);
        return false;
      }

      await refreshAdminData();
      await refreshBills();
      return true;
    } catch (err) {
      console.error("Table checkout failed:", err);
      return false;
    }
  };

  // Admin fetches all bills history
  const refreshBills = async () => {
    const token = adminToken || (typeof window !== 'undefined' ? sessionStorage.getItem("k_admin_token") : null);
    if (!restaurant || !token) return;

    try {
      const res = await customFetch(`${API_URL}/bills/restaurant/${restaurant._id}`);
      if (!res.ok) return;
      const data = await res.json();

      const formattedBills = data.map((b: any) => ({
        id: b._id,
        restaurantId: b.restaurantId,
        tableId: typeof b.tableId === 'object' && b.tableId ? b.tableId._id : b.tableId,
        tableNumber: typeof b.tableId === 'object' && b.tableId ? b.tableId.number : undefined,
        orderIds: b.orderIds,
        items: b.items.map((i: any) => ({
          menuItemId: i.menuItemId,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
        totalPrice: b.totalPrice,
        paymentMethod: b.paymentMethod,
        paymentStatus: b.paymentStatus,
        createdAt: b.createdAt,
        cashierId: b.cashierId,
        cashierName: b.cashierName,
        cashierUsername: b.cashierUsername,
      }));

      setBills(formattedBills);
    } catch (err) {
      console.error("Refresh bills failed:", err);
    }
  };

  // Admin deletes a single bill
  const deleteBill = async (id: string): Promise<boolean> => {
    try {
      const res = await customFetch(`${API_URL}/bills/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        alert("ไม่สามารถลบบิลได้ในขณะนี้");
        return false;
      }
      setBills((prev) => prev.filter((b) => b.id !== id));
      return true;
    } catch (err) {
      console.error("Delete bill failed:", err);
      return false;
    }
  };

  // Admin deletes all bills
  const deleteAllBills = async (): Promise<boolean> => {
    const token = adminToken || (typeof window !== 'undefined' ? sessionStorage.getItem("k_admin_token") : null);
    if (!restaurant || !token) return false;

    try {
      const res = await customFetch(`${API_URL}/bills/restaurant/${restaurant._id}/all`, {
        method: "DELETE",
      });

      if (!res.ok) {
        alert("ไม่สามารถลบบิลทั้งหมดได้ในขณะนี้");
        return false;
      }
      setBills([]);
      return true;
    } catch (err) {
      console.error("Delete all bills failed:", err);
      return false;
    }
  };

  // Admin adds a menu item
  const addMenuItem = async (item: { name: string; description: string; price: number; categoryId: string; imageUrl?: string }): Promise<boolean> => {
    if (!restaurant) {
      alert("ไม่พบข้อมูลร้านอาหาร กรุณาตรวจสอบการเชื่อมต่อหลังบ้าน");
      return false;
    }

    try {
      const res = await customFetch(`${API_URL}/menu-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: item.name,
          description: item.description,
          price: item.price,
          categoryId: item.categoryId,
          category: item.categoryId,
          restaurantId: restaurant._id,
          imageUrl: item.imageUrl,
        }),
      });

      if (!res.ok) {
        alert(`เกิดข้อผิดพลาดจากหลังบ้านในการเพิ่มเมนู: รหัสสถานะ ${res.status}`);
        return false;
      }

      // Refresh menu list
      const resMenu = await fetch(`${API_URL}/menu-items/restaurant/${restaurant._id}`);
      if (resMenu.ok) {
        const menuData = await resMenu.json();
        const formattedMenu = menuData.map((m: any) => formatMenuItem(m, categories, API_URL));
        setMenu(formattedMenu);
      }
      return true;
    } catch (err: any) {
      alert(`การเชื่อมต่อเพิ่มเมนูล้มเหลว: ${err.message || err}`);
      console.error("Add menu item failed:", err);
      return false;
    }
  };

  // Admin uploads a menu item image (Returns relative path like "/uploads/filename.png")
  const uploadMenuItemImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await customFetch(`${API_URL}/menu-items/upload-image`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) return null;
      const data = await res.json();
      return data.imageUrl;
    } catch (err) {
      console.error("Upload image error:", err);
      return null;
    }
  };

  // Admin updates a menu item
  const updateMenuItem = async (
    id: string,
    item: { name?: string; description?: string; price?: number; categoryId?: string; imageUrl?: string; isAvailable?: boolean }
  ): Promise<boolean> => {
    if (!restaurant) {
      alert("ไม่พบข้อมูลร้านอาหาร กรุณาตรวจสอบการเชื่อมต่อหลังบ้าน");
      return false;
    }

    try {
      const payload: any = {};
      if (item.name !== undefined) payload.name = item.name;
      if (item.description !== undefined) payload.description = item.description;
      if (item.price !== undefined) payload.price = item.price;
      if (item.categoryId !== undefined) {
        payload.categoryId = item.categoryId;
        payload.category = item.categoryId;
      }
      if (item.imageUrl !== undefined) {
        let rawUrl = item.imageUrl;
        if (rawUrl && rawUrl.includes("/uploads/")) {
          const parts = rawUrl.split("/uploads/");
          rawUrl = `/uploads/${parts[parts.length - 1]}`;
        }
        payload.imageUrl = rawUrl;
      }
      if (item.isAvailable !== undefined) payload.isAvailable = item.isAvailable;

      const res = await customFetch(`${API_URL}/menu-items/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        alert(`เกิดข้อผิดพลาดจากหลังบ้านในการแก้ไขเมนู: รหัสสถานะ ${res.status}`);
        return false;
      }

      // Refresh menu list
      const resMenu = await fetch(`${API_URL}/menu-items/restaurant/${restaurant._id}`);
      if (resMenu.ok) {
        const menuData = await resMenu.json();
        const formattedMenu = menuData.map((m: any) => formatMenuItem(m, categories, API_URL));
        setMenu(formattedMenu);
      }
      return true;
    } catch (err: any) {
      alert(`การเชื่อมต่อแก้ไขเมนูล้มเหลว: ${err.message || err}`);
      console.error("Update menu item failed:", err);
      return false;
    }
  };

  // Admin deletes menu item
  const deleteMenuItem = async (id: string): Promise<boolean> => {
    if (!restaurant) {
      alert("ไม่พบข้อมูลร้านอาหาร กรุณาตรวจสอบการเชื่อมต่อหลังบ้าน");
      return false;
    }

    try {
      const res = await customFetch(`${API_URL}/menu-items/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        alert(`เกิดข้อผิดพลาดจากหลังบ้านในการลบเมนู: รหัสสถานะ ${res.status}`);
        return false;
      }
      setMenu(menu.filter((m) => m.id !== id));
      return true;
    } catch (err: any) {
      alert(`การเชื่อมต่อลบเมนูล้มเหลว: ${err.message || err}`);
      console.error("Delete menu item failed:", err);
      return false;
    }
  };

  // Admin toggles menu item availability
  const toggleMenuAvailability = async (item: MenuItem): Promise<boolean> => {
    try {
      const res = await customFetch(`${API_URL}/menu-items/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isAvailable: !item.available }),
      });

      if (!res.ok) {
        alert(`เกิดข้อผิดพลาดจากหลังบ้านในการอัปเดตสถานะเมนู: รหัสสถานะ ${res.status}`);
        return false;
      }
      setMenu(
        menu.map((m) => (m.id === item.id ? { ...m, available: !m.available } : m))
      );
      return true;
    } catch (err: any) {
      alert(`การเชื่อมต่ออัปเดตสถานะล้มเหลว: ${err.message || err}`);
      console.error("Toggle item availability failed:", err);
      return false;
    }
  };

  // Admin fetches all users
  const refreshUsers = async () => {
    const token = adminToken || (typeof window !== 'undefined' ? sessionStorage.getItem("k_admin_token") : null);
    if (!token) return;

    try {
      const res = await customFetch(`${API_URL}/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Refresh users failed:", err);
    }
  };

  // Admin adds a new user
  const addUser = async (user: any): Promise<boolean> => {
    try {
      const res = await customFetch(`${API_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`ไม่สามารถเพิ่มพนักงานได้: ${errorData.message || res.statusText}`);
        return false;
      }
      await refreshUsers();
      return true;
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message || err}`);
      console.error("Add user failed:", err);
      return false;
    }
  };

  // Admin updates a user
  const updateUser = async (id: string, user: any): Promise<boolean> => {
    try {
      const res = await customFetch(`${API_URL}/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`ไม่สามารถแก้ไขพนักงานได้: ${errorData.message || res.statusText}`);
        return false;
      }
      await refreshUsers();
      return true;
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message || err}`);
      console.error("Update user failed:", err);
      return false;
    }
  };

  // Admin deletes a user
  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      const res = await customFetch(`${API_URL}/users/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`ไม่สามารถลบพนักงานได้: ${errorData.message || res.statusText}`);
        return false;
      }
      await refreshUsers();
      return true;
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message || err}`);
      console.error("Delete user failed:", err);
      return false;
    }
  };

  // Admin uploads an avatar image for a user
  const uploadUserAvatar = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await customFetch(`${API_URL}/users/upload-avatar`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) return null;
      const data = await res.json();
      return data.imageUrl;
    } catch (err) {
      console.error("Upload user avatar failed:", err);
      return null;
    }
  };

  // Admin transfers all pending orders from one table to another (moves table or merges tables)
  const moveTable = async (fromTableId: string, toTableId: string): Promise<boolean> => {
    try {
      const res = await customFetch(`${API_URL}/tables/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromTableId,
          toTableId,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Move table failed:", errorText);
        return false;
      }

      await refreshAdminData();
      return true;
    } catch (err) {
      console.error("Move table failed:", err);
      return false;
    }
  };

  // Admin adds a new dining table
  const addTable = async (number: string): Promise<boolean> => {
    if (!restaurant) return false;
    try {
      const res = await customFetch(`${API_URL}/tables`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number,
          restaurantId: restaurant._id,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Add table failed:", errorText);
        return false;
      }

      await refreshAdminData();
      return true;
    } catch (err) {
      console.error("Add table failed:", err);
      return false;
    }
  };

  // Admin deletes a dining table
  const deleteTable = async (tableId: string): Promise<boolean> => {
    try {
      const res = await customFetch(`${API_URL}/tables/${tableId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Delete table failed:", errorText);
        return false;
      }

      await refreshAdminData();
      return true;
    } catch (err) {
      console.error("Delete table failed:", err);
      return false;
    }
  };

  // Keep the back-of-house screens live. This used to be a setInterval whose
  // dependency list included values that change identity on every refresh, so
  // the timer was cleared and restarted before it could tick and the floor
  // only moved when someone reloaded the page.
  usePoll(
    () => {
      refreshAdminData();
      refreshBills();
      const isAdmin =
        adminUser?.role === 'admin' ||
        (typeof window !== 'undefined' &&
          JSON.parse(sessionStorage.getItem("k_admin_user") || '{}').role === 'admin');
      if (isAdmin) {
        refreshUsers();
      }
    },
    5000,
    Boolean(adminToken && restaurant),
  );

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen flex-col bg-brand-bg">
        <div className="awning" />
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="flex flex-col items-center gap-3 text-ink-soft">
            <span className="spinner h-8 w-8 text-primary" />
            <p className="text-sm">กำลังเปิดร้าน</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RestaurantContext.Provider
      value={{
        restaurant,
        categories,
        menu,
        tables,
        adminToken,
        adminUser,
        clientOrders,
        login,
        logout,
        placeOrder,
        updateOrderStatus,
        checkoutTable,
        addMenuItem,
        deleteMenuItem,
        toggleMenuAvailability,
        closeTableSession,
        fetchTableDetails,
        refreshClientOrders,
        refreshAdminData,
        getTableQrCode,
        moveTable,
        addTable,
        deleteTable,
        uploadMenuItemImage,
        updateMenuItem,
        bills,
        refreshBills,
        deleteBill,
        deleteAllBills,
        users,
        refreshUsers,
        addUser,
        updateUser,
        deleteUser,
        uploadUserAvatar,
        customFetch,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error("useRestaurant must be used within a RestaurantProvider");
  }
  return context;
}
