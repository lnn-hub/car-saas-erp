import { Suspense } from "react";
import type { Metadata } from "next";
import VehicleClient from "./VehicleClient";
import { getVehicle } from "@/lib/server-data";
import { optimizeImg } from "@/lib/site";

type Props = { params: Promise<{ id: string }> };

async function Loader({ params }: Props) {
  const { id } = await params;
  const initial = await getVehicle(id);
  return <VehicleClient id={id} initial={initial} />;
}

export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f5f5]" />}>
      <Loader params={params} />
    </Suspense>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const v = await getVehicle(id);
  if (!v) return { title: "Машин" };
  const name = `${v.year} ${v.brand} ${v.model}`;
  const price = Number(v.total_cost) > 0 ? `${Number(v.total_cost).toLocaleString("en-US")}₮ · ` : "";
  const description = `${price}${v.mileage ? `${Number(v.mileage).toLocaleString("en-US")} км · ` : ""}${v.color || ""}`.replace(/ · $/, "");
  const image = optimizeImg(v.images?.[0] ?? null, 1200);
  return {
    title: name,
    description,
    openGraph: { title: name, description, ...(image ? { images: [{ url: image, width: 1200 }] } : {}) },
    twitter: { card: "summary_large_image", title: name, description, ...(image ? { images: [image] } : {}) },
  };
}
