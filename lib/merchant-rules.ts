import { CategoryId, UserRule } from "./types";

/**
 * Deterministic merchant -> category rules.
 *
 * These run BEFORE the LLM: well-known merchants (Uber, Netflix, gas stations,
 * supermarkets, ...) are matched by keyword and get a high confidence without
 * spending an LLM call. Only merchants that don't match any rule fall through
 * to the AI categorizer.
 *
 * Order matters: more specific rules must come first (e.g. "uber eats" -> food
 * before "uber" -> transport). The first matching rule wins.
 */

interface MerchantRule {
  categoryId: CategoryId;
  keywords: string[];
}

const RULES: MerchantRule[] = [
  {
    categoryId: "food",
    keywords: [
      "uber eats",
      "ubereats",
      "rappi",
      "didi food",
      "pedidosya",
      "mcdonald",
      "burger king",
      "kfc",
      "pizza",
      "papa john",
      "subway",
      "starbucks",
      "taco bell",
      "wendy",
      "spoon",
      "rostipollos",
      "restaurante",
      " soda ",
      "cafeteria",
    ],
  },
  {
    categoryId: "fuel",
    keywords: [
      "gasolinera",
      "servicentro",
      "estacion de servicio",
      "combustible",
      "delta ",
      " uno ",
      "gasotica",
      "terra ",
    ],
  },
  {
    categoryId: "supermarket",
    keywords: [
      "walmart",
      "automercado",
      "pali",
      "maxi pali",
      "mas x menos",
      "masxmenos",
      "pricesmart",
      "megasuper",
      "mega super",
      "perimercados",
      "supermercado",
      "am pm",
      "ampm",
      "fresh market",
    ],
  },
  {
    categoryId: "subscriptions",
    keywords: [
      "netflix",
      "spotify",
      "disney",
      "hbo",
      "hbo max",
      "youtube premium",
      "amazon prime",
      "prime video",
      "apple.com/bill",
      "icloud",
      "google storage",
      "chatgpt",
      "openai",
      "adobe",
      "microsoft 365",
      "office 365",
      "dropbox",
      "canva",
    ],
  },
  {
    categoryId: "entertainment",
    keywords: [
      "cinepolis",
      "cinemark",
      "nova cinemas",
      "steam",
      "playstation",
      "nintendo",
      "xbox",
      "epic games",
    ],
  },
  {
    categoryId: "health",
    keywords: [
      "farmacia",
      "fischel",
      "sucre",
      "la bomba",
      "hospital",
      "clinica",
      "laboratorio",
      "medismart",
      "ebais",
      "dentista",
      "optica",
    ],
  },
  {
    categoryId: "utilities",
    keywords: [
      "ice ",
      "kolbi",
      "aya",
      "acueductos",
      "cnfl",
      "compania nacional de fuerza",
      "racsa",
      "instituto costarricense de elect",
      "esph",
    ],
  },
  {
    categoryId: "hardware",
    keywords: [
      "epa ",
      "construplaza",
      "ferreteria",
      "el lagar",
      "capris",
      "amanco",
      "importadora monge",
    ],
  },
  {
    categoryId: "personal_care",
    keywords: [
      "barberia",
      "salon",
      "peluqueria",
      " spa ",
      "gimnasio",
      "smart fit",
      "gym",
    ],
  },
  {
    categoryId: "education",
    keywords: [
      "universidad",
      "colegio",
      "uned",
      "ucr",
      "ulacit",
      "ulatina",
      "libreria",
      "coursera",
      "udemy",
      "platzi",
    ],
  },
  {
    categoryId: "pets",
    keywords: ["veterinaria", "veterinario", "mascota", "pet ", "petshop"],
  },
  {
    categoryId: "shopping",
    keywords: [
      "amazon",
      "aliexpress",
      "shein",
      "temu",
      "ebay",
      "mercado libre",
      "zara",
      "adidas",
      "nike",
      "aeropost",
      "siman",
      "universal",
    ],
  },
  {
    categoryId: "transport",
    keywords: [
      "uber",
      "didi",
      "taxi",
      "peaje",
      "parqueo",
      "parking",
      "riteve",
      "dekra",
      "tren",
      "autobus",
    ],
  },
];

/** Normalize a merchant name: lowercase, strip accents, collapse spaces. */
export function normalizeMerchant(merchant: string): string {
  return ` ${merchant
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()} `; // pad so " uno " style keywords can match at edges
}

export interface MerchantMatch {
  categoryId: CategoryId;
  confidence: number;
}

/**
 * Try to categorize a merchant using the built-in deterministic rules.
 * Returns a high-confidence match, or null when nothing matches.
 */
export function matchMerchantCategory(merchant: string): MerchantMatch | null {
  if (!merchant) return null;
  const haystack = normalizeMerchant(merchant);

  for (const rule of RULES) {
    for (const keyword of rule.keywords) {
      if (haystack.includes(keyword)) {
        return { categoryId: rule.categoryId, confidence: 95 };
      }
    }
  }

  return null;
}

/**
 * Try to categorize a merchant using the user's own rules. User rules win over
 * the built-in ones (confidence 100). The most recently created matching rule
 * takes precedence.
 */
export function matchUserRules(
  merchant: string,
  rules: UserRule[]
): MerchantMatch | null {
  if (!merchant || rules.length === 0) return null;
  const haystack = normalizeMerchant(merchant);

  // Prefer more specific (longer) patterns so "montezuma condominio" beats
  // a broader "montezuma" if both exist.
  const sorted = [...rules].sort((a, b) => b.pattern.length - a.pattern.length);
  for (const rule of sorted) {
    if (rule.pattern && haystack.includes(rule.pattern)) {
      return { categoryId: rule.categoryId, confidence: 100 };
    }
  }
  return null;
}

// Noise tokens that make a poor rule keyword on their own.
const KEYWORD_STOPWORDS = new Set([
  "pago",
  "compra",
  "com",
  "sa",
  "srl",
  "cr",
  "crc",
  "usd",
  "san",
  "jose",
  "costa",
  "rica",
  "the",
  "de",
  "la",
  "el",
]);

/**
 * Suggest a keyword to seed a user rule from a merchant name: the first
 * meaningful word (>= 3 chars, not a number, not a stopword). Falls back to the
 * full normalized merchant.
 */
export function suggestKeyword(merchant: string): string {
  const normalized = normalizeMerchant(merchant).trim();
  const words = normalized.split(" ");
  for (const word of words) {
    const clean = word.replace(/[^a-z0-9]/g, "");
    if (clean.length >= 3 && !/^\d+$/.test(clean) && !KEYWORD_STOPWORDS.has(clean)) {
      return clean;
    }
  }
  return normalized;
}
