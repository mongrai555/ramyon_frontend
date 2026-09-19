"use client";

import React, { useState, useEffect } from "react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import Brand from "@/components/Brand";

export default function AdminLogin() {
  const { login, adminToken } = useRestaurant();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (adminToken) {
      router.push("/admin");
    }
  }, [adminToken, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const success = await login(username, password);
    setLoading(false);

    if (success) {
      router.push("/admin");
    } else {
      setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ตรงกับที่บันทึกไว้ ลองพิมพ์อีกครั้ง");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-brand-bg">
      <div className="awning" />

      <header className="flex items-center justify-between border-b border-edge px-5 py-3">
        <Link href="/" aria-label="รามยอนออนนี่">
          <Brand size="sm" />
        </Link>
        <Link
          href="/"
          className="btn btn-quiet btn-sm"
        >
          <Icon name="back" size={15} />
          หน้าแรก
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center p-5">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            เข้าใช้งานหลังร้าน
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            สำหรับพนักงานของร้าน ใช้บัญชีที่ผู้จัดการสร้างให้
          </p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-tile border border-primary/30 bg-primary/5 px-3.5 py-3 text-sm leading-relaxed text-primary-dark"
              >
                <Icon name="warning" size={16} className="mt-0.5" />
                {error}
              </p>
            )}

            <div>
              <label htmlFor="username" className="field-label">
                ชื่อผู้ใช้
              </label>
              <input
                id="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น admin"
                className="field"
              />
            </div>

            <div>
              <label htmlFor="password" className="field-label">
                รหัสผ่าน
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-red btn-lg mt-2 w-full"
            >
              {loading ? (
                <>
                  <span className="spinner h-4 w-4" />
                  กำลังเข้าสู่ระบบ
                </>
              ) : (
                <>
                  <Icon name="key" size={17} />
                  เข้าสู่ระบบ
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-xs leading-relaxed text-ink-faint">
            ลืมรหัสผ่าน ให้ผู้จัดการร้านตั้งรหัสใหม่ให้จากหน้าจัดการพนักงาน
          </p>
        </div>
      </main>

      <footer className="border-t border-edge px-5 py-4 text-center text-xs text-ink-faint">
        รามยอนออนนี่ · ระบบหลังร้าน
      </footer>
    </div>
  );
}
