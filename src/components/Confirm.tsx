"use client";

import React from "react";
import Modal from "@/components/Modal";

/**
 * Asked before anything is thrown away. It states what will happen in the
 * shop's own words rather than the system's, and the action keeps the same
 * name as the button that opened it.
 */
export default function Confirm({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  tone = "danger",
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: "danger" | "neutral";
}) {
  return (
    <Modal title={title} onClose={onCancel} width="max-w-sm">
      <p className="text-sm leading-relaxed text-ink-soft">{body}</p>

      <div className="mt-6 flex gap-2">
        <button type="button" onClick={onCancel} className="btn btn-plain flex-1">
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`btn flex-1 ${tone === "danger" ? "btn-red" : "btn-ink"}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
