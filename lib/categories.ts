import { Category, CategoryId } from "./types";

export const CATEGORIES: Record<CategoryId, Category> = {
  food: {
    id: "food",
    name: "Comida y Restaurantes",
    icon: "🍔",
    color: "#f97316", // orange
  },
  supermarket: {
    id: "supermarket",
    name: "Supermercado",
    icon: "🛒",
    color: "#eab308", // yellow
  },
  transport: {
    id: "transport",
    name: "Transporte",
    icon: "🚗",
    color: "#3b82f6", // blue
  },
  fuel: {
    id: "fuel",
    name: "Combustible",
    icon: "⛽",
    color: "#e11d48", // rose
  },
  utilities: {
    id: "utilities",
    name: "Servicios Públicos",
    icon: "💡",
    color: "#14b8a6", // teal
  },
  housing: {
    id: "housing",
    name: "Vivienda / Alquiler",
    icon: "🏠",
    color: "#0ea5e9", // sky
  },
  health: {
    id: "health",
    name: "Salud",
    icon: "💊",
    color: "#22c55e", // green
  },
  entertainment: {
    id: "entertainment",
    name: "Entretenimiento",
    icon: "🎬",
    color: "#a855f7", // purple
  },
  subscriptions: {
    id: "subscriptions",
    name: "Suscripciones",
    icon: "🔁",
    color: "#8b5cf6", // violet
  },
  shopping: {
    id: "shopping",
    name: "Compras",
    icon: "🛍️",
    color: "#ec4899", // pink
  },
  hardware: {
    id: "hardware",
    name: "Ferretería",
    icon: "🔧",
    color: "#b45309", // amber-800
  },
  personal_care: {
    id: "personal_care",
    name: "Cuidado Personal",
    icon: "💇",
    color: "#d946ef", // fuchsia
  },
  education: {
    id: "education",
    name: "Educación",
    icon: "🎓",
    color: "#6366f1", // indigo
  },
  pets: {
    id: "pets",
    name: "Mascotas",
    icon: "🐾",
    color: "#84cc16", // lime
  },
  services: {
    id: "services",
    name: "Servicios",
    icon: "📱",
    color: "#06b6d4", // cyan
  },
  other: {
    id: "other",
    name: "Otro",
    icon: "📦",
    color: "#6b7280", // gray
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

export function getCategoryById(id: CategoryId): Category {
  return CATEGORIES[id] || CATEGORIES.other;
}

