"use client";

import React, { useState } from "react";
import Link from "next/link";
import Icon, { IconName } from "@/components/Icon";
import Brand from "@/components/Brand";

export type NavItem =
  | { kind: "tab"; key: string; label: string; icon: IconName }
  | {
      kind: "link";
      href: string;
      label: string;
      icon: IconName;
      tone?: "red" | "plain";
    };

/**
 * The counter-side chrome. Dark, warm and identical on every back-of-house
 * screen, so staff always know which room they are standing in.
 */
export default function AdminBar({
  items,
  activeKey,
  onSelect,
  user,
  onLogout,
  apiUrl,
  lead,
  room,
}: {
  items: NavItem[];
  activeKey?: string;
  onSelect?: (key: string) => void;
  user?: { displayName?: string; username?: string; role?: string; profileImageUrl?: string } | null;
  onLogout?: () => void;
  apiUrl?: string;
  lead?: React.ReactNode;
  room?: string;
}) {
  const [open, setOpen] = useState(false);

  const avatar = (size: number) => {
    const raw = user?.profileImageUrl;
    const src = raw
      ? raw.startsWith("http")
        ? raw
        : `${(apiUrl ?? "").replace("/api", "")}${raw}`
      : null;

    return src ? (
      // avatars are served by the API host, outside next/image's optimiser
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        style={{ width: size, height: size }}
        className="rounded-full border border-kds-edge object-cover"
      />
    ) : (
      <span
        style={{ width: size, height: size }}
        className="font-display flex items-center justify-center rounded-full bg-primary text-sm font-bold text-white uppercase"
      >
        {(user?.displayName || user?.username || "?").substring(0, 1)}
      </span>
    );
  };

  const navButton = (item: NavItem, block = false) => {
    const base = `btn btn-sm ${block ? "w-full justify-start" : ""}`;

    if (item.kind === "link") {
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          className={
            item.tone === "red"
              ? `${base} btn-red`
              : `${base} border-kds-edge bg-kds-raise text-kds-text hover:bg-kds-edge`
          }
        >
          <Icon name={item.icon} size={16} />
          {item.label}
        </Link>
      );
    }

    const active = activeKey === item.key;
    return (
      <button
        key={item.key}
        type="button"
        onClick={() => {
          onSelect?.(item.key);
          setOpen(false);
        }}
        aria-current={active}
        className={`${base} ${
          active
            ? "bg-brand-bg text-ink"
            : "text-kds-mute hover:bg-kds-raise hover:text-kds-text"
        }`}
      >
        <Icon name={item.icon} size={16} />
        {item.label}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-ink text-kds-text">
      <div className="awning" />

      <div className="flex items-center justify-between gap-4 px-4 py-2.5 md:px-6">
        <div className="flex min-w-0 items-center gap-4">
          {lead}
          <Link href="/admin" className="shrink-0">
            <Brand size="sm" tone="dark" />
          </Link>
          <span className="hidden truncate text-xs text-kds-mute lg:block">
            {room ?? "ระบบหลังร้าน"}
          </span>
        </div>

        <nav className="hidden items-center gap-1.5 md:flex">
          {items.map((i) => navButton(i))}

          {user && (
            <span className="ml-1.5 flex items-center gap-2.5 border-l border-kds-edge pl-3">
              {avatar(32)}
              <span className="flex flex-col leading-tight">
                <span className="max-w-28 truncate text-xs font-semibold">
                  {user.displayName || user.username}
                </span>
                <span className="text-xs text-kds-mute">
                  {user.role === "admin" ? "ผู้จัดการ" : "พนักงาน"}
                </span>
              </span>
            </span>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              aria-label="ออกจากระบบ"
              className="btn btn-sm px-2.5 text-kds-mute hover:bg-kds-raise hover:text-kds-text"
            >
              <Icon name="logout" size={17} />
            </button>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label="เมนู"
          aria-expanded={open}
          className="btn btn-sm border-kds-edge px-2.5 text-kds-text md:hidden"
        >
          <Icon name={open ? "close" : "menu"} size={20} />
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-1.5 border-t border-kds-edge px-4 py-4 md:hidden">
          {items.map((i) => navButton(i, true))}

          {user && (
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-kds-edge pt-4">
              <span className="flex items-center gap-2.5">
                {avatar(36)}
                <span className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold">
                    {user.displayName || user.username}
                  </span>
                  <span className="text-xs text-kds-mute">
                    {user.role === "admin" ? "ผู้จัดการ" : "พนักงาน"}
                  </span>
                </span>
              </span>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="btn btn-sm border-kds-edge text-kds-mute hover:text-kds-text"
                >
                  <Icon name="logout" size={16} />
                  ออกจากระบบ
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
