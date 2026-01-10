import { Category, CategoryId } from "./types";

export const CATEGORIES: Record<CategoryId, Category> = {
  food: {
    id: "food",
    name: "Comida y Restaurantes",
    icon: "🍔",
    color: "#f97316", // orange
  },
  transport: {
    id: "transport",
    name: "Transporte",
    icon: "🚗",
    color: "#3b82f6", // blue
  },
  entertainment: {
    id: "entertainment",
    name: "Entretenimiento",
    icon: "🎬",
    color: "#a855f7", // purple
  },
  shopping: {
    id: "shopping",
    name: "Compras",
    icon: "🛍️",
    color: "#ec4899", // pink
  },
  services: {
    id: "services",
    name: "Servicios",
    icon: "📱",
    color: "#06b6d4", // cyan
  },
  health: {
    id: "health",
    name: "Salud",
    icon: "💊",
    color: "#22c55e", // green
  },
  supermarket: {
    id: "supermarket",
    name: "Supermercado",
    icon: "🛒",
    color: "#eab308", // yellow
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

