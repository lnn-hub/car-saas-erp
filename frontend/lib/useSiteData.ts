"use client";
import { useEffect, useState } from "react";
import { BACKEND, Company, SiteInitial, TeamMember, Vehicle, companyQuery } from "./site";

export function useSiteData(initial?: SiteInitial | null) {
  const [company, setCompany] = useState<Company | null>(initial?.company ?? null);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initial?.vehicles ?? []);
  const [team, setTeam] = useState<TeamMember[]>(initial?.team ?? []);
  const [loading, setLoading] = useState(!initial);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load(retry = 0) {
      try {
        const [comp, data, members] = await Promise.all([
          fetch(`${BACKEND}/api/public${companyQuery()}`).then((r) => r.json()),
          fetch(`${BACKEND}/api/public/vehicles${companyQuery()}`).then((r) => r.json()),
          fetch(`${BACKEND}/api/public/team${companyQuery()}`).then((r) => r.json()).catch(() => []),
        ]);
        if (cancelled) return;
        if (!comp.error) setCompany(comp);
        setVehicles(data.vehicles || []);
        setTeam(Array.isArray(members) ? members : []);
        setLoading(false);
        setRetrying(false);
      } catch {
        if (cancelled) return;
        if (retry < 3) {
          setRetrying(true);
          setTimeout(() => load(retry + 1), 3000 * (retry + 1));
        } else {
          setLoading(false);
          setRetrying(false);
        }
      }
    }
    fetch(`${BACKEND}/health`).catch(() => {});
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { company, vehicles, team, loading, retrying };
}

export function useCompany() {
  const [company, setCompany] = useState<Company | null>(null);
  useEffect(() => {
    fetch(`${BACKEND}/api/public${companyQuery()}`)
      .then((r) => r.json())
      .then((c) => { if (!c.error) setCompany(c); })
      .catch(() => {});
  }, []);
  return company;
}
