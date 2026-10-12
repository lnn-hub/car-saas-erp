import type { Metadata } from "next";
import AboutClient from "./AboutClient";
import { getSiteData } from "@/lib/server-data";

export const metadata: Metadata = { title: "Бидний тухай" };

export default async function Page() {
  const initial = await getSiteData();
  return <AboutClient initial={initial} />;
}
