import HomeClient from "./HomeClient";
import { getSiteData } from "@/lib/server-data";

export default async function Page() {
  const initial = await getSiteData();
  return <HomeClient initial={initial} />;
}
