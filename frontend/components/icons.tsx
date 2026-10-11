export function IconDashboard({ className = 'w-4 h-4' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>;
}
export function IconCar({ className = 'w-4 h-4' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M5 17H3a1 1 0 01-1-1v-4l2.5-5h13l2.5 5v4a1 1 0 01-1 1h-2"/>
    <circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
  </svg>;
}
export function IconPlus({ className = 'w-4 h-4' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M12 5v14M5 12h14"/>
  </svg>;
}
export function IconSales({ className = 'w-4 h-4' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h13M9 19.5a.5.5 0 11-1 0 .5.5 0 011 0zm7 0a.5.5 0 11-1 0 .5.5 0 011 0z"/>
  </svg>;
}
export function IconLogout({ className = 'w-4 h-4' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
  </svg>;
}
export function IconChevronRight({ className = 'w-4 h-4' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M9 18l6-6-6-6"/>
  </svg>;
}
export function IconArrowLeft({ className = 'w-4 h-4' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M19 12H5M12 5l-7 7 7 7"/>
  </svg>;
}
