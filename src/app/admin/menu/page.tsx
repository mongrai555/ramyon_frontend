"use client";

import React, { useState, useEffect } from "react";
import { useRestaurant, MenuItem } from "@/context/RestaurantContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminBar from "@/components/AdminBar";
import Icon from "@/components/Icon";
import Thumb from "@/components/Thumb";
import Modal from "@/components/Modal";
import Confirm from "@/components/Confirm";

export default function MenuManagement() {
  const {
    menu,
    categories,
    adminToken,
    adminUser,
    logout,
    addMenuItem,
    deleteMenuItem,
    toggleMenuAvailability,
    uploadMenuItemImage,
    updateMenuItem,
  } = useRestaurant();
  const router = useRouter();
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

  useEffect(() => {
    if (!adminToken) {
      router.push("/admin/login");
    }
  }, [adminToken, router]);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingDelete, setPendingDelete] = useState<MenuItem | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const filteredMenu = menu.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" || item.categoryId === selectedCategory;
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.koreanName && item.koreanName.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  // Grouped the way the customer sees the board, so edits happen in context
  const sections = (
    selectedCategory === "all"
      ? categories
      : categories.filter((c) => c.id === selectedCategory)
  )
    .map((cat) => ({
      ...cat,
      items: filteredMenu.filter((i) => i.categoryId === cat.id),
    }))
    .filter((s) => s.items.length > 0);

  const uncategorised = filteredMenu.filter(
    (i) => !categories.some((c) => c.id === i.categoryId)
  );
  if (uncategorised.length > 0) {
    sections.push({
      id: "__other",
      name: "ยังไม่ได้จัดหมวด",
      description: "",
      items: uncategorised,
    });
  }

  const soldOutCount = menu.filter((i) => !i.available).length;

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName("");
    setDescription("");
    setPrice("");
    setCategoryId(categories[0]?.id || "");
    setSelectedFile(null);
    setImagePreview(null);
    setFormError("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || "");
    setPrice(String(item.price));
    setCategoryId(item.categoryId);
    setSelectedFile(null);
    setImagePreview(item.imageUrl || null);
    setFormError("");
    setIsFormOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim() || !price) {
      setFormError("ต้องมีชื่อเมนูและราคาก่อนจึงจะบันทึกได้");
      return;
    }

    const targetCategoryId = categoryId || categories[0]?.id;
    if (!targetCategoryId) {
      setFormError("ยังไม่มีหมวดในระบบ สร้างหมวดก่อนแล้วค่อยเพิ่มเมนู");
      return;
    }

    setIsSaving(true);
    let uploadedImageUrl: string | undefined = undefined;

    if (selectedFile) {
      const uploadedPath = await uploadMenuItemImage(selectedFile);
      if (!uploadedPath) {
        setFormError("อัปโหลดรูปไม่สำเร็จ ลองไฟล์เล็กลงหรือกดบันทึกอีกครั้ง");
        setIsSaving(false);
        return;
      }
      uploadedImageUrl = uploadedPath;
    } else if (editingItem && !imagePreview) {
      uploadedImageUrl = "";
    }

    const success = editingItem
      ? await updateMenuItem(editingItem.id, {
          name,
          description,
          price: Number(price),
          categoryId: targetCategoryId,
          imageUrl: uploadedImageUrl,
        })
      : await addMenuItem({
          name,
          description: description || "",
          price: Number(price),
          categoryId: targetCategoryId,
          imageUrl: uploadedImageUrl,
        });

    setIsSaving(false);

    if (success) {
      setIsFormOpen(false);
      setEditingItem(null);
      setSelectedFile(null);
      setImagePreview(null);
    } else {
      setFormError("บันทึกไม่สำเร็จ ตรวจการเชื่อมต่อหลังบ้านแล้วลองอีกครั้ง");
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <AdminBar
        room="เมนูของร้าน"
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
        ]}
      />

      {/* The state of the board in one line, then the tools to change it */}
      <div className="border-b border-edge bg-shell">
        <div className="mx-auto max-w-4xl px-4 py-4 md:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                เมนูของร้าน
              </h1>
              <p className="mt-1 text-sm text-ink-soft">
                {menu.length} รายการบนบอร์ด
                {soldOutCount > 0
                  ? ` มี ${soldOutCount} รายการที่ปิดขายอยู่ตอนนี้`
                  : " ขายได้ครบทุกรายการ"}
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="btn btn-red"
            >
              <Icon name="plus" size={17} />
              เพิ่มเมนู
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rail -mx-1 flex-1 gap-1 px-1">
              {[{ id: "all", name: "ทั้งหมด" }, ...categories].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`tab ${selectedCategory === cat.id ? "tab-on" : ""}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="relative sm:w-64">
              <Icon
                name="search"
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อเมนู"
                aria-label="ค้นหาเมนู"
                className="field pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        {sections.length === 0 ? (
          <div className="panel-sunk px-6 py-16 text-center">
            <h2 className="font-display text-lg font-bold">
              {menu.length === 0 ? "บอร์ดยังว่างอยู่" : "ไม่มีเมนูที่ตรงกับที่ค้น"}
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
              {menu.length === 0
                ? "เพิ่มจานแรกเข้าไป แล้วลูกค้าที่สแกนโค้ดบนโต๊ะจะเห็นทันที"
                : "ลองพิมพ์คำอื่น หรือเลือกหมวดทั้งหมดเพื่อดูรายการที่เหลือ"}
            </p>
            <button
              type="button"
              onClick={menu.length === 0 ? handleOpenAdd : () => {
                setSearchTerm("");
                setSelectedCategory("all");
              }}
              className="btn btn-red mt-6"
            >
              {menu.length === 0 ? "เพิ่มเมนูแรก" : "ล้างการค้นหา"}
            </button>
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.id} className="pb-8">
              <div className="mb-1 flex items-baseline gap-3">
                <h2 className="font-display text-lg font-bold tracking-tight">
                  {section.name}
                </h2>
                <span className="leader" />
                <span className="text-xs text-ink-faint">
                  {section.items.length} รายการ
                </span>
              </div>

              <ul className="panel divide-y divide-edge-soft overflow-hidden">
                {section.items.map((item) => (
                  <li
                    key={item.id}
                    className={`flex flex-wrap items-start gap-x-3 gap-y-3 p-4 ${
                      item.available ? "" : "bg-shell/60"
                    }`}
                  >
                    <Thumb
                      src={item.imageUrl}
                      emoji={item.emoji}
                      size="h-14 w-14"
                      text="text-2xl"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <h3
                          className={`font-display text-base font-semibold leading-snug ${
                            item.available ? "" : "text-ink-soft"
                          }`}
                        >
                          {item.name}
                        </h3>
                        <span className="leader" />
                        <span className="font-display shrink-0 text-base font-bold tabular-nums text-primary-dark">
                          {item.price}
                          <span className="ml-0.5 text-xs font-semibold text-ink-faint">
                            ฿
                          </span>
                        </span>
                      </div>

                      {item.koreanName && (
                        <p className="mt-0.5 text-xs text-ink-faint">
                          {item.koreanName}
                        </p>
                      )}

                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-soft">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={item.available}
                          aria-label={`${item.name} พร้อมขาย`}
                          onClick={() => toggleMenuAvailability(item)}
                          className={`switch ${item.available ? "switch-on" : ""}`}
                        />
                        <span
                          className={`w-24 text-xs font-semibold ${
                            item.available ? "text-ink-soft" : "text-primary-dark"
                          }`}
                        >
                          {item.available ? "พร้อมขาย" : "ปิดขายชั่วคราว"}
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        aria-label={`แก้ไข ${item.name}`}
                        className="btn btn-quiet btn-sm px-2.5"
                      >
                        <Icon name="edit" size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(item)}
                        aria-label={`ลบ ${item.name}`}
                        className="btn btn-quiet btn-sm px-2.5 hover:bg-primary/5 hover:text-primary-dark"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>

      {isFormOpen && (
        <Modal
          title={editingItem ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่"}
          note={
            editingItem
              ? "บันทึกแล้วลูกค้าที่เปิดเมนูอยู่จะเห็นของใหม่ในไม่กี่วินาที"
              : "จานใหม่จะขึ้นบนบอร์ดของทุกโต๊ะทันทีที่บันทึก"
          }
          onClose={() => setIsFormOpen(false)}
          width="max-w-lg"
        >
          <form onSubmit={handleSaveItem} className="flex flex-col gap-4">
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
              <label htmlFor="dish-name" className="field-label">
                ชื่อเมนูอย่างที่ลูกค้าจะเห็น
              </label>
              <input
                id="dish-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น รามยอนทะเลเผ็ด"
                className="field"
              />
            </div>

            <div>
              <label htmlFor="dish-desc" className="field-label">
                คำอธิบายสั้น ๆ
              </label>
              <textarea
                id="dish-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="บอกว่ามีอะไรอยู่ในชาม เผ็ดแค่ไหน"
                className="field resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="dish-price" className="field-label">
                  ราคาต่อจาน (฿)
                </label>
                <input
                  id="dish-price"
                  type="number"
                  required
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="150"
                  className="field tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="dish-cat" className="field-label">
                  อยู่หมวดไหนบนบอร์ด
                </label>
                <select
                  id="dish-cat"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="field"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <span className="field-label">รูปจาน</span>
              <div className="flex items-start gap-4">
                <span className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-tile border border-edge bg-shell">
                  {imagePreview ? (
                    <>
                      {/* object URL or backend upload, outside next/image */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        aria-label="เอารูปออก"
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-white"
                      >
                        <Icon name="close" size={13} />
                      </button>
                    </>
                  ) : (
                    <Icon name="image" size={26} className="text-ink-faint" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleFileChange}
                    aria-label="เลือกรูปจาน"
                    className="w-full text-xs text-ink-soft file:mr-3 file:cursor-pointer file:rounded-tile file:border file:border-edge file:bg-brand-card file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ink hover:file:bg-shell"
                  />
                  <p className="mt-2 text-xs leading-relaxed text-ink-faint">
                    ถ่ายจากด้านบนให้เห็นทั้งชาม ถ้าไม่ใส่รูป
                    บอร์ดจะใช้สัญลักษณ์ของจานแทน
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-red btn-lg mt-1 w-full"
            >
              {isSaving ? (
                <>
                  <span className="spinner h-4 w-4" />
                  กำลังบันทึก
                </>
              ) : editingItem ? (
                "บันทึกการแก้ไข"
              ) : (
                "เพิ่มขึ้นบอร์ด"
              )}
            </button>
          </form>
        </Modal>
      )}

      {pendingDelete && (
        <Confirm
          title={`ลบ ${pendingDelete.name}`}
          body="เมนูนี้จะหายจากบอร์ดของทุกโต๊ะ ถ้าแค่ของหมดวันนี้ ให้ปิดขายชั่วคราวแทนจะดีกว่า"
          confirmLabel="ลบออกจากบอร์ด"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteMenuItem(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}
