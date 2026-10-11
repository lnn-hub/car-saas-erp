"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { IconArrowLeft } from "@/components/icons";
import { COLORS } from "@/lib/vehicle-data";

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
  ARRIVED: { label: "Ирсэн", dot: "bg-amber-400" },
  PUBLISHED: { label: "Нийтлэгдсэн", dot: "bg-blue-400" },
  RESERVED: { label: "Захиалгатай", dot: "bg-violet-400" },
  SOLD: { label: "Зарагдсан", dot: "bg-emerald-400" },
};
const STATUS_NEXT = ["ARRIVED", "PUBLISHED", "RESERVED"];
const PAYMENT_TYPES = [
  { value: "CASH", label: "Бэлэн", icon: "" },
  { value: "LOAN", label: "Зээл", icon: "" },
  { value: "LEASING", label: "Лизинг", icon: "" },
];

const inp =
  "w-full bg-white border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#c00] transition-colors";

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
      <div className="px-4 sm:px-8 py-5 sm:py-7 text-[#a1a1aa] text-sm">Ачааллаж байна...</div>
    );

  const totalCost = vehicle.costs.reduce((s, c) => s + Number(c.amount), 0);
  const salePriceNum = Number(salePrice) || 0;
  const profit = salePriceNum - totalCost;
  const margin =
    salePriceNum > 0 ? ((profit / salePriceNum) * 100).toFixed(1) : "0";
  const colorHex = COLORS.find((c) => c.value === vehicle.color)?.hex;

  return (
    <div className="px-4 sm:px-8 py-5 sm:py-7 max-w-2xl space-y-5">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-[#a1a1aa] hover:text-[#09090b] text-sm transition-colors"
      >
        <IconArrowLeft className="w-4 h-4" /> Буцах
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#09090b]">
            {vehicle.brand} {vehicle.model}{" "}
            <span className="text-[#a1a1aa] font-normal">{vehicle.year}</span>
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${STATUS[vehicle.status]?.dot}`}
            />
            <span className="text-xs text-[#71717a]">
              {STATUS[vehicle.status]?.label}
            </span>
            {colorHex && (
              <span className="flex items-center gap-1 text-xs text-[#71717a]">
                <span
                  className="w-3 h-3 rounded-full border border-[#e4e4e7] inline-block"
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
            className="flex items-center gap-1.5 bg-[#c00] hover:bg-[#a00] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
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
        <div className="bg-[#f4f4f5] border border-[#e4e4e7] rounded-md px-4 py-2.5 text-sm text-[#71717a]">
          {msg}
        </div>
      )}

      {/* Info grid */}
      <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e4e4e7]">
          <span className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">
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
              <div className="text-[10px] text-[#a1a1aa] mb-0.5 uppercase tracking-wider">
                {k}
              </div>
              <div className="text-sm text-[#09090b] font-medium">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Status change */}
      {vehicle.status !== "SOLD" && (
        <div className="bg-white border border-[#e4e4e7] rounded-lg p-4">
          <div className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider mb-3">
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
                    ? "border-[#e4e4e7] bg-[#f4f4f5] text-[#a1a1aa] cursor-default"
                    : "border-[#e4e4e7] text-[#71717a] hover:border-[#d4d4d8] hover:text-[#09090b]"
                }`}
              >
                {STATUS[s]?.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Costs */}
      <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e4e4e7] flex items-center justify-between">
          <span className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">
            Зардлууд
          </span>
          <span className="text-xs text-[#71717a]">
            Нийт{" "}
            <span className="text-[#09090b] font-semibold tabular-nums">
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
                      ? "border-b border-[#f4f4f5]"
                      : ""
                  }
                >
                  <td className="px-4 py-3 text-[#71717a]">
                    {COST_LABELS[c.cost_type] || c.cost_type}
                  </td>
                  <td className="px-4 py-3 text-[#a1a1aa] text-xs">
                    {c.note || "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-[#09090b] tabular-nums font-medium">
                    {Number(c.amount).toLocaleString("mn-MN")}
                    {c.currency === "MNT" ? "₮" : ` ${c.currency}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {vehicle.costs.length === 0 && (
          <div className="text-center text-[#a1a1aa] text-sm py-8">
            Зардал оруулаагүй байна
          </div>
        )}

        {vehicle.status !== "SOLD" && (
          <form
            onSubmit={addCost}
            className="p-4 border-t border-[#e4e4e7] space-y-3"
          >
            <div className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">
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
              className="px-3.5 py-1.5 text-sm bg-[#c00] hover:bg-[#a00] text-white rounded-md font-medium transition-colors"
            >
              Нэмэх
            </button>
          </form>
        )}
      </div>

      {/* ── SALE MODAL ── */}
      {showSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white border border-[#e4e4e7] rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            {saleSuccess ? (
              /* Амжилттай */
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-emerald-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-[#09090b] mb-1">
                  Амжилттай зарагдлаа!
                </h2>
                <p className="text-sm text-[#71717a] mb-1">
                  {vehicle.brand} {vehicle.model} {vehicle.year}
                </p>
                <p className="text-base font-bold text-emerald-600 mb-1">
                  {fmt(salePriceNum)}
                </p>
                <p
                  className={`text-sm mb-6 ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}
                >
                  Ашиг: {profit >= 0 ? "+" : ""}
                  {fmt(profit)} ({margin}%)
                </p>
                <button
                  onClick={() => {
                    setShowSale(false);
                    router.push("/vehicles");
                  }}
                  className="w-full bg-[#c00] hover:bg-[#a00] text-white font-medium py-2.5 rounded-md text-sm transition-colors"
                >
                  Машинуудруу буцах
                </button>
              </div>
            ) : (
              <>
                {/* Modal header */}
                <div className="px-5 py-4 border-b border-[#e4e4e7] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[#09090b]">
                      Машин зарах
                    </h2>
                    <p className="text-xs text-[#a1a1aa] mt-0.5">
                      {vehicle.brand} {vehicle.model} {vehicle.year} · Өртөг:{" "}
                      {fmt(totalCost)}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSale(false)}
                    className="text-[#a1a1aa] hover:text-[#09090b]"
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
                      <label className="text-xs font-medium text-[#3f3f46]">
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
                            className={`px-2 py-0.5 text-xs rounded transition-colors ${custMode === m ? "bg-[#c00] text-white" : "text-[#71717a] hover:text-[#09090b]"}`}
                          >
                            {m === "search" ? "Хайх" : "Шинэ"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {custMode === "search" ? (
                      <div className="relative">
                        {selCustomer ? (
                          <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-md">
                            <div>
                              <span className="text-sm font-medium text-[#09090b]">
                                {selCustomer.name}
                              </span>
                              {selCustomer.phone && (
                                <span className="text-xs text-[#71717a] ml-2">
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
                              className="text-[#a1a1aa] hover:text-[#09090b]"
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
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e4e4e7] rounded-md shadow-lg z-10 overflow-hidden">
                                {custResults.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setSelCustomer(c);
                                      setCustQuery("");
                                      setCustResults([]);
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#f4f4f5] text-left transition-colors"
                                  >
                                    <span className="text-sm text-[#09090b]">
                                      {c.name}
                                    </span>
                                    <span className="text-xs text-[#a1a1aa]">
                                      {c.phone}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                            {custQuery.length >= 2 &&
                              custResults.length === 0 && (
                                <p className="text-xs text-[#a1a1aa] mt-1.5">
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
                    <label className="text-xs font-medium text-[#3f3f46] block mb-1.5">
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
                        className={`mt-2 px-3 py-2 rounded-md text-xs flex items-center justify-between ${profit >= 0 ? "bg-emerald-50 border border-emerald-100" : "bg-red-50 border border-red-100"}`}
                      >
                        <span
                          className={
                            profit >= 0 ? "text-emerald-700" : "text-red-600"
                          }
                        >
                          {profit >= 0 ? "Ашиг" : "Алдагдал"}
                        </span>
                        <span
                          className={`font-semibold tabular-nums ${profit >= 0 ? "text-emerald-700" : "text-red-600"}`}
                        >
                          {profit >= 0 ? "+" : ""}
                          {fmt(profit)} ({margin}%)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Огноо */}
                  <div>
                    <label className="text-xs font-medium text-[#3f3f46] block mb-1.5">
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
                    <label className="text-xs font-medium text-[#3f3f46] block mb-2">
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
                              ? "border-[#c00] bg-[#c00] text-white"
                              : "border-[#e4e4e7] text-[#71717a] hover:border-[#d4d4d8] hover:text-[#09090b]"
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
                      className="flex-1 py-2.5 text-sm text-[#71717a] border border-[#e4e4e7] rounded-md hover:border-[#d4d4d8] hover:text-[#09090b] transition-colors"
                    >
                      Болих
                    </button>
                    <button
                      type="submit"
                      disabled={saleLoading}
                      className="flex-1 py-2.5 text-sm font-semibold bg-[#c00] hover:bg-[#a00] disabled:opacity-40 text-white rounded-md transition-colors"
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
        <div className="px-4 sm:px-8 py-5 sm:py-7 text-[#a1a1aa] text-sm">
          Ачааллаж байна...
        </div>
      }
    >
      <VehicleDetailContent />
    </Suspense>
  );
}
