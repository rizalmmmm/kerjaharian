/** Ikon besar per kategori agar mudah dikenali tanpa banyak membaca. */
export const CATEGORY_ICONS: Record<string, string> = {
  "Gudang & Logistik": "📦",
  "Retail & Toko": "🏪",
  Event: "🎉",
  "Konstruksi & Renovasi": "🧱",
  "Kurir & Pengiriman": "🛵",
  Kebersihan: "🧹",
  "Rumah Makan & Katering": "🍳",
  "Pertanian & Perkebunan": "🌾",
  "Makeup (MUA)": "💄",
  "Tukang Elektronik": "🔌",
  "Tukang Mekanik": "🔧",
  Programmer: "💻",
  Lainnya: "🧰",
};

export const categoryIcon = (c: string) => CATEGORY_ICONS[c] ?? "🧰";
