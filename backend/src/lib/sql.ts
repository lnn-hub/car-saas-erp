// UPDATE ... SET хэсгийг зөвхөн өгсөн (undefined биш) талбаруудаар бүтээнэ.
// Баганын нэр нь zod схемийн түлхүүрээс ирдэг (хэрэглэгчийн оролт биш), утга нь параметр ($1, $2...) болно.
export function updateSet(values: Record<string, unknown>, startIndex = 1) {
  const entries = Object.entries(values).filter(([, v]) => v !== undefined);
  return {
    sql: entries.map(([column], i) => `${column} = $${i + startIndex}`).join(', '),
    params: entries.map(([, v]) => v),
    isEmpty: entries.length === 0,
  };
}
