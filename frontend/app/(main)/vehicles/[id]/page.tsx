"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { IconArrowLeft } from "@/components/icons";
import { COLORS } from "@/lib/vehicle-data";

const FILES = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const fileSrc = (u: string) => (u.startsWith("http") ? u : `${FILES}${u}`);

interface Cost {
  id: string;
  cost_type: string;
  amount: string;
  currency: string;
  note: string;
}
interface Customer {
  id: string;
  name: string;
  phone: string;
}
interface Vehicle {
  id: string;
  vin: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  color: string;
  fuel_type: string;
  transmission: string;
  status: string;
  description: string;
  engine_cc: number | null;
  has_plates: boolean;
  manufactured_date: string | null;
  images: { id: string; url: string; is_main: boolean }[];
  costs: Cost[];
}

const COST_LABELS: Record<string, string> = {
  PURCHASE: "Авсан үнэ",
  SHIPPING: "Тээвэр",
  CUSTOMS: "Гааль",
  REPAIR: "Засвар",
  CLEANING: "Угаалга",
  OTHER: "Бусад",
};
const FUEL_LABELS: Record<string, string> = {
  PETROL: "Бензин",
  DIESEL: "Дизель",
  HYBRID: "Хибрид",
  ELECTRIC: "Цахилгаан",
};
const STATUS: Record<string, { label: string; dot: string }> = {
  ARRIVED: { label: "Ирсэн", dot: "bg-zinc-400" },
  PUBLISHED: { label: "Нийтлэгдсэн", dot: "bg-brand" },
  RESERVED: { label: "Захиалгатай", dot: "bg-zinc-700" },
  SOLD: { label: "Зарагдсан", dot: "bg-zinc-300" },
};
const STATUS_NEXT = ["ARRIVED", "PUBLISHED", "RESERVED"];
const PAYMENT_TYPES = [
  { value: "CASH", label: "Бэлэн", icon: "" },
  { value: "LOAN", label: "Зээл", icon: "" },
  { value: "LEASING", label: "Лизинг", icon: "" },
];

const inp =
  "w-full bg-white border border-[#e6e0d8] rounded-md px-3 py-2 text-sm text-[#1c1917] placeholder-[#6f6a64] focus:outline-none focus:border-brand transition-colors";

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "сая₮";
  return n.toLocaleString("mn-MN") + "₮";
}

function VehicleDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [costForm, setCostForm] = useState({
    cost_type: "PURCHASE",
    amount: "",
    currency: "MNT",
    note: "",
  });
  const [showSale, setShowSale] = useState(false);
  const [msg, setMsg] = useState("");
  const [photoBusy, setPhotoBusy] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [edit, setEdit] = useState({
    brand: "", model: "", year: "", mileage: "", color: "", fuel_type: "PETROL",
    transmission: "AUTO", engine_l: "", manufactured_date: "", has_plates: false, description: "",
  });
  const photoRef = useRef<HTMLInputElement>(null);
  const [saleSuccess, setSaleSuccess] = useState(false);

  // Sale form state
  const [salePrice, setSalePrice] = useState("");
  const [payType, setPayType] = useState("CASH");
  const [soldAt, setSoldAt] = useState("");
  const [saleLoading, setSaleLoading] = useState(false);

  // Customer search
  const [custQuery, setCustQuery] = useState("");
  const [custResults, setCustResults] = useState<Customer[]>([]);
  const [selCustomer, setSelCustomer] = useState<Customer | null>(null);
  const [custMode, setCustMode] = useState<"search" | "new">("search");
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function load() {
    api.getVehicle(id).then(setVehicle).catch(console.error);
  }
  useEffect(() => {
    load();
    setSoldAt(new Date().toISOString().slice(0, 10));
  }, [id]);

  // Customer search debounce
  useEffect(() => {
    if (custMode !== "search") return;
    if (searchRef.current) clearTimeout(searchRef.current);
    if (custQuery.length < 2) {
      setCustResults([]);
      return;
    }
    searchRef.current = setTimeout(async () => {
      try {
        const d = await api.searchCustomers(custQuery);
        setCustResults(Array.isArray(d) ? d.slice(0, 6) : []);
      } catch {}
    }, 300);
  }, [custQuery, custMode]);

  async function addCost(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.addCost(id, costForm);
      setCostForm({
        cost_type: "PURCHASE",
        amount: "",
        currency: "MNT",
        note: "",
      });
      setMsg("Зардал нэмэгдлээ");
      load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Алдаа");
    }
  }

  async function changeStatus(status: string) {
    try {
      await api.updateStatus(id, status);
      setMsg("Статус шинэчлэгдлээ");
      load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Алдаа");
    }
  }

  async function doSale(e: React.FormEvent) {
    e.preventDefault();
    if (!salePrice || Number(salePrice) <= 0) return;
    setSaleLoading(true);
    try {
      let customerId: string;

      if (selCustomer) {
        customerId = selCustomer.id;
      } else {
        const c = await api.createCustomer({ name: newCustName, phone: newCustPhone });
        customerId = c.id;
      }

      await api.createSale({
        vehicle_id: id,
        customer_id: customerId,
        sale_price: Number(salePrice),
        payment_type: payType,
        sold_at: soldAt,
      });

      setSaleSuccess(true);
      load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Алдаа");
    } finally {
      setSaleLoading(false);
    }
  }

  async function addPhotos(files: FileList | null) {
    if (!files || !files.length) return;
    const list = Array.from(files);
    let failed = 0;
    for (const [i, f] of list.entries()) {
      setPhotoBusy(`Зураг оруулж байна ${i + 1}/${list.length}...`);
      try { await api.uploadVehicleImage(id, f); } catch { failed++; }
    }
    setPhotoBusy("");
    if (photoRef.current) photoRef.current.value = "";
    setMsg(failed ? `${failed} зураг оруулж чадсангүй` : "Зураг нэмэгдлээ");
    load();
  }
  async function makeMain(imageId: string) {
    try { await api.setMainImage(imageId); setMsg("Үндсэн зураг солигдлоо"); load(); }
    catch (err: unknown) { setMsg(err instanceof Error ? err.message : "Алдаа"); }
  }
  async function removePhoto(imageId: string) {
    if (!confirm("Энэ зургийг устгах уу?")) return;
    try { await api.deleteVehicleImage(imageId); setMsg("Зураг устгагдлаа"); load(); }
    catch (err: unknown) { setMsg(err instanceof Error ? err.message : "Алдаа"); }
  }
  function openEdit() {
    if (!vehicle) return;
    setEdit({
      brand: vehicle.brand, model: vehicle.model, year: String(vehicle.year), mileage: String(vehicle.mileage ?? 0),
      color: vehicle.color || "", fuel_type: vehicle.fuel_type, transmission: vehicle.transmission,
      engine_l: vehicle.engine_cc ? String(Number(vehicle.engine_cc) / 1000) : "",
      manufactured_date: vehicle.manufactured_date ? vehicle.manufactured_date.slice(0, 10) : "",
      has_plates: !!vehicle.has_plates, description: vehicle.description || "",
    });
    setEditOpen(true);
  }
  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditBusy(true);
    try {
      await api.updateVehicle(id, {
        brand: edit.brand.trim(), model: edit.model.trim(), year: Number(edit.year),
        mileage: Number(edit.mileage) || 0, color: edit.color, fuel_type: edit.fuel_type,
        transmission: edit.transmission,
        engine_cc: edit.engine_l ? Math.round(Number(edit.engine_l) * 1000) : null,
        manufactured_date: edit.manufactured_date || null, has_plates: edit.has_plates,
        description: edit.description,
      });
      setEditOpen(false);
      setMsg("Мэдээлэл хадгалагдлаа");
      load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Алдаа");
    } finally { setEditBusy(false); }
  }
  async function removeVehicle() {
    if (!vehicle) return;
    if (!confirm(`"${vehicle.brand} ${vehicle.model} ${vehicle.year}"-г бүр мөсөн устгах уу? Энэ үйлдлийг буцаах боломжгүй.`)) return;
    try { await api.deleteVehicle(id); router.push("/vehicles"); }
    catch (err: unknown) { setMsg(err instanceof Error ? err.message : "Алдаа"); }
  }

  function openSaleModal() {
    setShowSale(true);
    setSaleSuccess(false);
    setSalePrice("");
    setPayType("CASH");
    setCustQuery("");
    setCustResults([]);
    setSelCustomer(null);
    setCustMode("search");
    setNewCustName("");
    setNewCustPhone("");
    setSoldAt(new Date().toISOString().slice(0, 10));
  }

  if (!vehicle)
    return (
      <div className="px-4 sm:px-8 py-5 sm:py-7 text-[#6f6a64] text-sm">Ачааллаж байна...</div>
    );

  const totalCost = vehicle.costs.reduce((s, c) => s + Number(c.amount), 0);
  const salePriceNum = Number(salePrice) || 0;
  const profit = salePriceNum - totalCost;
  const margin =
    salePriceNum > 0 ? ((profit / salePriceNum) * 100).toFixed(1) : "0";
  const colorHex = COLORS.find((c) => c.value === vehicle.color)?.hex;

  return (
    <div className="px-4 sm:px-8 py-5 sm:py-7 max-w-2xl mx-auto space-y-5">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-[#6f6a64] hover:text-[#1c1917] text-sm transition-colors"
      >
        <IconArrowLeft className="w-4 h-4" /> Буцах
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#1c1917]">
            {vehicle.brand} {vehicle.model}{" "}
            <span className="text-[#6f6a64] font-normal">{vehicle.year}</span>
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${STATUS[vehicle.status]?.dot}`}
            />
            <span className="text-xs text-[#5f5a54]">
              {STATUS[vehicle.status]?.label}
            </span>
            {colorHex && (
              <span className="flex items-center gap-1 text-xs text-[#5f5a54]">
                <span
                  className="w-3 h-3 rounded-full border border-[#e6e0d8] inline-block"
                  style={{ backgroundColor: colorHex }}
                />
                {vehicle.color}
              </span>
            )}
          </div>
        </div>
        {vehicle.status !== "SOLD" && (
          <button
            onClick={openSaleModal}
            className="flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
            Зарах
          </button>
        )}
      </div>

      {msg && (
        <div className="bg-[#f3efe9] border border-[#e6e0d8] rounded-md px-4 py-2.5 text-sm text-[#5f5a54]">
          {msg}
        </div>
      )}

      {/* Gallery */}
      <div className="bg-white border border-[#e6e0d8] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e6e0d8] flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-[#6f6a64]">
            Зураг ({vehicle.images?.length || 0})
          </span>
          <div>
            <input ref={photoRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => addPhotos(e.target.files)} />
            <button type="button" onClick={() => photoRef.current?.click()} disabled={!!photoBusy}
              className="text-xs font-medium text-brand hover:text-brand-dark disabled:opacity-40">
              {photoBusy || "+ Зураг нэмэх"}
            </button>
          </div>
        </div>
        {vehicle.images?.length ? (
          <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {vehicle.images.map((img) => (
              <div key={img.id} className="group relative aspect-[4/3] rounded-md overflow-hidden border border-[#e6e0d8] bg-[#f3efe9]">
                <img src={fileSrc(img.url)} alt="" className="w-full h-full object-cover" loading="lazy" />
                {img.is_main && (
                  <span className="absolute top-2 left-2 bg-brand text-white text-xs font-medium px-2 py-0.5 rounded-sm">Үндсэн</span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex gap-1 p-1.5 bg-gradient-to-t from-black/70 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {!img.is_main && (
                    <button type="button" onClick={() => makeMain(img.id)}
                      className="flex-1 bg-white/90 hover:bg-white text-[#111] text-xs font-bold py-1 rounded-sm">Үндсэн болгох</button>
                  )}
                  <button type="button" onClick={() => removePhoto(img.id)}
                    className="bg-white/90 hover:bg-brand hover:text-white text-brand text-xs font-bold px-2.5 py-1 rounded-sm">Устгах</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-[#6f6a64] text-sm py-10">Зураг оруулаагүй байна</div>
        )}
      </div>

      {/* Info grid */}
      <div className="bg-white border border-[#e6e0d8] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e6e0d8]">
          <span className="text-xs font-medium text-[#6f6a64]">
            Мэдээлэл
          </span>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          {[
            ["VIN код", vehicle.vin],
            ["Гүйлт", vehicle.mileage.toLocaleString() + " км"],
            ["Өнгө", vehicle.color || "—"],
            ["Түлш", FUEL_LABELS[vehicle.fuel_type] || vehicle.fuel_type],
            [
              "Хурдны хайрцаг",
              vehicle.transmission === "AUTO" ? "Автомат" : "Механик",
            ],
            ["Нийт өртөг", fmt(totalCost)],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-xs text-[#6f6a64] mb-0.5">
                {k}
              </div>
              <div className="text-sm text-[#1c1917] font-medium">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit info */}
      <div className="bg-white border border-[#e6e0d8] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e6e0d8] flex items-center justify-between">
          <span className="text-xs font-medium text-[#6f6a64]">Мэдээлэл засах</span>
          {!editOpen && (
            <button type="button" onClick={openEdit}
              className="text-xs font-medium text-brand hover:text-brand-dark">Засах</button>
          )}
        </div>
        {editOpen && (
          <form onSubmit={saveEdit} className="p-4 grid grid-cols-2 gap-3">
            <input value={edit.brand} onChange={(e) => setEdit((p) => ({ ...p, brand: e.target.value }))} placeholder="Марк" className={inp} required />
            <input value={edit.model} onChange={(e) => setEdit((p) => ({ ...p, model: e.target.value }))} placeholder="Загвар" className={inp} required />
            <input type="number" value={edit.year} onChange={(e) => setEdit((p) => ({ ...p, year: e.target.value }))} placeholder="Он" className={inp} required />
            <input type="number" value={edit.mileage} onChange={(e) => setEdit((p) => ({ ...p, mileage: e.target.value }))} placeholder="Гүйлт (км)" className={inp} />
            <select value={edit.color} onChange={(e) => setEdit((p) => ({ ...p, color: e.target.value }))} className={inp}>
              <option value="">Өнгө</option>
              {COLORS.map((c) => <option key={c.value} value={c.value}>{c.value}</option>)}
            </select>
            <input type="number" step="0.1" value={edit.engine_l} onChange={(e) => setEdit((p) => ({ ...p, engine_l: e.target.value }))} placeholder="Хөдөлгүүр (литр)" className={inp} />
            <select value={edit.fuel_type} onChange={(e) => setEdit((p) => ({ ...p, fuel_type: e.target.value }))} className={inp}>
              {Object.entries(FUEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={edit.transmission} onChange={(e) => setEdit((p) => ({ ...p, transmission: e.target.value }))} className={inp}>
              <option value="AUTO">Автомат</option>
              <option value="MANUAL">Механик</option>
            </select>
            <input type="date" value={edit.manufactured_date} onChange={(e) => setEdit((p) => ({ ...p, manufactured_date: e.target.value }))} className={inp} />
            <label className="flex items-center gap-2 text-sm text-[#46413c]">
              <input type="checkbox" checked={edit.has_plates} onChange={(e) => setEdit((p) => ({ ...p, has_plates: e.target.checked }))} className="accent-[#8b1e2d]" />
              Улсын дугаартай
            </label>
            <textarea value={edit.description} onChange={(e) => setEdit((p) => ({ ...p, description: e.target.value }))} rows={6}
              placeholder={"Тайлбар. Онцлох тоноглолыг мөр бүрийн эхэнд • тэмдэгтэй бичнэ."} className={inp + " col-span-2 resize-y"} />
            <div className="col-span-2 flex gap-2">
              <button type="button" onClick={() => setEditOpen(false)}
                className="flex-1 py-2.5 text-sm text-[#5f5a54] border border-[#e6e0d8] rounded-md hover:border-[#d4ccc2]">Болих</button>
              <button type="submit" disabled={editBusy}
                className="flex-1 py-2.5 text-sm bg-brand hover:bg-brand-dark disabled:opacity-40 text-white rounded-md font-medium">
                {editBusy ? "Хадгалж байна..." : "Хадгалах"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Status change */}
      {vehicle.status !== "SOLD" && (
        <div className="bg-white border border-[#e6e0d8] rounded-lg p-4">
          <div className="text-xs font-medium text-[#6f6a64] mb-3">
            Статус өөрчлөх
          </div>
          <div className="flex gap-2">
            {STATUS_NEXT.map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                disabled={vehicle.status === s}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors border ${
                  vehicle.status === s
                    ? "border-[#e6e0d8] bg-[#f3efe9] text-[#6f6a64] cursor-default"
                    : "border-[#e6e0d8] text-[#5f5a54] hover:border-[#d4ccc2] hover:text-[#1c1917]"
                }`}
              >
                {STATUS[s]?.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Costs */}
      <div className="bg-white border border-[#e6e0d8] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e6e0d8] flex items-center justify-between">
          <span className="text-xs font-medium text-[#6f6a64]">
            Зардлууд
          </span>
          <span className="text-xs text-[#5f5a54]">
            Нийт{" "}
            <span className="text-[#1c1917] font-semibold tabular-nums">
              {fmt(totalCost)}
            </span>
          </span>
        </div>
        {vehicle.costs.length > 0 && (
          <table className="w-full text-sm">
            <tbody>
              {vehicle.costs.map((c, i) => (
                <tr
                  key={c.id}
                  className={
                    i < vehicle.costs.length - 1
                      ? "border-b border-[#f3efe9]"
                      : ""
                  }
                >
                  <td className="px-4 py-3 text-[#5f5a54]">
                    {COST_LABELS[c.cost_type] || c.cost_type}
                  </td>
                  <td className="px-4 py-3 text-[#6f6a64] text-xs">
                    {c.note || "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-[#1c1917] tabular-nums font-medium">
                    {Number(c.amount).toLocaleString("mn-MN")}
                    {c.currency === "MNT" ? "₮" : ` ${c.currency}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {vehicle.costs.length === 0 && (
          <div className="text-center text-[#6f6a64] text-sm py-8">
            Зардал оруулаагүй байна
          </div>
        )}

        {vehicle.status !== "SOLD" && (
          <form
            onSubmit={addCost}
            className="p-4 border-t border-[#e6e0d8] space-y-3"
          >
            <div className="text-xs font-medium text-[#6f6a64]">
              Зардал нэмэх
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={costForm.cost_type}
                onChange={(e) =>
                  setCostForm((p) => ({ ...p, cost_type: e.target.value }))
                }
                className={inp}
              >
                {Object.entries(COST_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Дүн"
                value={costForm.amount}
                onChange={(e) =>
                  setCostForm((p) => ({ ...p, amount: e.target.value }))
                }
                className={inp}
                required
              />
              <select
                value={costForm.currency}
                onChange={(e) =>
                  setCostForm((p) => ({ ...p, currency: e.target.value }))
                }
                className={inp}
              >
                <option value="MNT">MNT ₮</option>
                <option value="USD">USD $</option>
                <option value="JPY">JPY ¥</option>
              </select>
              <input
                placeholder="Тайлбар"
                value={costForm.note}
                onChange={(e) =>
                  setCostForm((p) => ({ ...p, note: e.target.value }))
                }
                className={inp}
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-sm bg-brand hover:bg-brand-dark text-white rounded-md font-medium transition-colors"
            >
              Нэмэх
            </button>
          </form>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-[#1c1917]">Машин устгах</div>
          <div className="text-xs text-[#6f6a64] mt-0.5">Зураг, зардлын хамт бүрмөсөн устна. Борлуулалттай машиныг устгах боломжгүй.</div>
        </div>
        <button type="button" onClick={removeVehicle}
          className="shrink-0 text-sm text-brand border border-brand/30 hover:bg-brand hover:text-white hover:border-brand px-4 py-2 rounded-md transition-colors font-medium">Устгах</button>
      </div>

      {/* ── SALE MODAL ── */}
      {showSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white border border-[#e6e0d8] rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            {saleSuccess ? (
              /* Амжилттай */
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-[#111]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-[#1c1917] mb-1">
                  Амжилттай зарагдлаа!
                </h2>
                <p className="text-sm text-[#5f5a54] mb-1">
                  {vehicle.brand} {vehicle.model} {vehicle.year}
                </p>
                <p className="text-base font-bold text-[#111] mb-1">
                  {fmt(salePriceNum)}
                </p>
                <p
                  className={`text-sm mb-6 ${profit >= 0 ? "text-[#111]" : "text-brand"}`}
                >
                  Ашиг: {profit >= 0 ? "+" : ""}
                  {fmt(profit)} ({margin}%)
                </p>
                <button
                  onClick={() => {
                    setShowSale(false);
                    router.push("/vehicles");
                  }}
                  className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-2.5 rounded-md text-sm transition-colors"
                >
                  Машинуудруу буцах
                </button>
              </div>
            ) : (
              <>
                {/* Modal header */}
                <div className="px-5 py-4 border-b border-[#e6e0d8] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[#1c1917]">
                      Машин зарах
                    </h2>
                    <p className="text-xs text-[#6f6a64] mt-0.5">
                      {vehicle.brand} {vehicle.model} {vehicle.year} · Өртөг:{" "}
                      {fmt(totalCost)}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSale(false)}
                    className="text-[#6f6a64] hover:text-[#1c1917]"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={doSale} className="p-5 space-y-4">
                  {/* Үйлчлүүлэгч */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-[#46413c]">
                        Үйлчлүүлэгч
                      </label>
                      <div className="flex gap-1">
                        {(["search", "new"] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setCustMode(m);
                              setSelCustomer(null);
                              setCustQuery("");
                            }}
                            className={`px-2 py-0.5 text-xs rounded transition-colors ${custMode === m ? "bg-brand text-white" : "text-[#5f5a54] hover:text-[#1c1917]"}`}
                          >
                            {m === "search" ? "Хайх" : "Шинэ"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {custMode === "search" ? (
                      <div className="relative">
                        {selCustomer ? (
                          <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-md">
                            <div>
                              <span className="text-sm font-medium text-[#1c1917]">
                                {selCustomer.name}
                              </span>
                              {selCustomer.phone && (
                                <span className="text-xs text-[#5f5a54] ml-2">
                                  {selCustomer.phone}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelCustomer(null);
                                setCustQuery("");
                              }}
                              className="text-[#6f6a64] hover:text-[#1c1917]"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <>
                            <input
                              value={custQuery}
                              onChange={(e) => setCustQuery(e.target.value)}
                              placeholder="Нэр эсвэл утас хайх..."
                              className={inp}
                            />
                            {custResults.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e6e0d8] rounded-md shadow-lg z-10 overflow-hidden">
                                {custResults.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setSelCustomer(c);
                                      setCustQuery("");
                                      setCustResults([]);
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#f3efe9] text-left transition-colors"
                                  >
                                    <span className="text-sm text-[#1c1917]">
                                      {c.name}
                                    </span>
                                    <span className="text-xs text-[#6f6a64]">
                                      {c.phone}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                            {custQuery.length >= 2 &&
                              custResults.length === 0 && (
                                <p className="text-xs text-[#6f6a64] mt-1.5">
                                  Олдсонгүй — "Шинэ" дарж нэмнэ үү
                                </p>
                              )}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="Нэр *"
                          value={newCustName}
                          onChange={(e) => setNewCustName(e.target.value)}
                          className={inp}
                          required
                        />
                        <input
                          placeholder="Утас"
                          value={newCustPhone}
                          onChange={(e) => setNewCustPhone(e.target.value)}
                          className={inp}
                        />
                      </div>
                    )}
                  </div>

                  {/* Зарагдсан үнэ */}
                  <div>
                    <label className="text-xs font-medium text-[#46413c] block mb-1.5">
                      Зарагдсан үнэ (₮)
                    </label>
                    <input
                      type="number"
                      placeholder="30,000,000"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      className={inp + " text-lg font-semibold tabular-nums"}
                      required
                    />

                    {/* Ашгийн preview */}
                    {salePriceNum > 0 && (
                      <div
                        className={`mt-2 px-3 py-2 rounded-md text-xs flex items-center justify-between ${profit >= 0 ? "bg-zinc-50 border border-zinc-200" : "bg-brand-soft border border-brand/20"}`}
                      >
                        <span
                          className={
                            profit >= 0 ? "text-[#111]" : "text-brand"
                          }
                        >
                          {profit >= 0 ? "Ашиг" : "Алдагдал"}
                        </span>
                        <span
                          className={`font-semibold tabular-nums ${profit >= 0 ? "text-[#111]" : "text-brand"}`}
                        >
                          {profit >= 0 ? "+" : ""}
                          {fmt(profit)} ({margin}%)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Огноо */}
                  <div>
                    <label className="text-xs font-medium text-[#46413c] block mb-1.5">
                      Зарагдсан огноо
                    </label>
                    <input
                      type="date"
                      value={soldAt}
                      onChange={(e) => setSoldAt(e.target.value)}
                      className={inp}
                    />
                  </div>

                  {/* Төлбөрийн хэлбэр */}
                  <div>
                    <label className="text-xs font-medium text-[#46413c] block mb-2">
                      Төлбөрийн хэлбэр
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_TYPES.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setPayType(p.value)}
                          className={`flex flex-col items-center py-2.5 rounded-lg border transition-colors ${
                            payType === p.value
                              ? "border-brand bg-brand text-white"
                              : "border-[#e6e0d8] text-[#5f5a54] hover:border-[#d4ccc2] hover:text-[#1c1917]"
                          }`}
                        >
                          <span className="text-base mb-0.5">{p.icon}</span>
                          <span className="text-xs font-medium">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowSale(false)}
                      className="flex-1 py-2.5 text-sm text-[#5f5a54] border border-[#e6e0d8] rounded-md hover:border-[#d4ccc2] hover:text-[#1c1917] transition-colors"
                    >
                      Болих
                    </button>
                    <button
                      type="submit"
                      disabled={saleLoading}
                      className="flex-1 py-2.5 text-sm font-semibold bg-brand hover:bg-brand-dark disabled:opacity-40 text-white rounded-md transition-colors"
                    >
                      {saleLoading ? "Боловсруулж байна..." : "Зарах"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function VehicleDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 sm:px-8 py-5 sm:py-7 text-[#6f6a64] text-sm">
          Ачааллаж байна...
        </div>
      }
    >
      <VehicleDetailContent />
    </Suspense>
  );
}
