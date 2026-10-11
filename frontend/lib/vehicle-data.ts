export const BRANDS_MODELS: Record<string, string[]> = {
  'Toyota':       ['Camry','Corolla','Land Cruiser','Prado','RAV4','Hilux','Alphard','Vellfire','Hiace','Crown','Harrier','C-HR','Estima','Fortuner','Rush'],
  'Lexus':        ['LX570','LX600','GX460','RX350','RX450h','ES350','IS300','NX300','UX200'],
  'Hyundai':      ['Sonata','Tucson','Santa Fe','Elantra','Grandeur','Starex','Porter','Palisade','Ioniq5'],
  'Kia':          ['Sorento','Sportage','K5','K7','K8','Mohave','Carnival','Telluride','EV6'],
  'BMW':          ['3 Series','5 Series','7 Series','X3','X5','X7','M3','M5'],
  'Mercedes-Benz':['C-Class','E-Class','S-Class','GLE','GLC','GLS','A-Class','CLS'],
  'Honda':        ['CR-V','Accord','Civic','Pilot','Odyssey','HR-V','Fit'],
  'Nissan':       ['X-Trail','Patrol','Pathfinder','Murano','Navara','Leaf','Kicks'],
  'Mitsubishi':   ['Outlander','Pajero','Eclipse Cross','L200','ASX','Montero'],
  'Land Rover':   ['Discovery','Defender','Range Rover','Range Rover Sport','Freelander'],
  'Audi':         ['A4','A6','A8','Q5','Q7','Q8','A3','e-tron'],
  'Volkswagen':   ['Tiguan','Passat','Golf','Touareg','Arteon'],
  'Ford':         ['F-150','Explorer','Everest','Ranger','Mustang'],
  'Chevrolet':    ['Tahoe','Suburban','Silverado','Traverse','Equinox'],
  'Jeep':         ['Wrangler','Grand Cherokee','Cherokee','Compass'],
  'Subaru':       ['Outback','Forester','XV','Legacy','Impreza'],
  'Mazda':        ['CX-5','CX-9','Mazda3','Mazda6','CX-30'],
  'Бусад':        [],
};

export const BRANDS = Object.keys(BRANDS_MODELS);

export const COLORS = [
  { value: 'Цагаан',    hex: '#ffffff' },
  { value: 'Хар',       hex: '#1a1a1a' },
  { value: 'Мөнгөлөг', hex: '#c0c0c0' },
  { value: 'Саарал',   hex: '#808080' },
  { value: 'Улаан',    hex: '#dc2626' },
  { value: 'Цэнхэр',   hex: '#2563eb' },
  { value: 'Ногоон',   hex: '#16a34a' },
  { value: 'Шар',      hex: '#ca8a04' },
  { value: 'Хүрэн',    hex: '#7c2d12' },
  { value: 'Бежийн',   hex: '#d4c5a9' },
  { value: 'Бор',      hex: '#854d0e' },
  { value: 'Цайвар цэнхэр', hex: '#38bdf8' },
];

export const WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];

export function getWeekday(dateStr: string): string {
  if (!dateStr) return '';
  return WEEKDAYS[new Date(dateStr).getDay()];
}
