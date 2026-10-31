import { Suspense } from "react";
import HomeClient from "./HomeClient";
import { getSiteData } from "@/lib/server-data";

async function Home() {
  const initial = await getSiteData();
  return <HomeClient initial={initial} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Home />
    </Suspense>
  );
}
