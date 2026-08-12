export type CategoryId =
  | "food"
  | "supermarket"
  | "transport"
  | "fuel"
  | "utilities"
  | "housing"
  | "health"
  | "entertainment"
  | "subscriptions"
  | "shopping"
  | "hardware"
  | "personal_care"
  | "education"
  | "pets"
  | "services"
  | "other";

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  merchant: string;
  categoryId: CategoryId;
  confidence: number; // 0-100
  isManuallyClassified: boolean;
  transactionDate: string;
  authorizationCode?: string;
  reference?: string;
  cardLastFour?: string;
  bankSource: string;
  emailId: string;
  createdAt: string;
}

export interface EmailParseResult {
  success: boolean;
  transaction?: Omit<Transaction, "id" | "categoryId" | "confidence" | "isManuallyClassified" | "createdAt">;
  error?: string;
}

export interface LLMCategorizationResult {
  categoryId: CategoryId;
  confidence: number;
  reasoning?: string;
}

export interface MonthlyStats {
  month: string;
  total: number;
  byCategory: Record<CategoryId, number>;
  transactionCount: number;
}

export interface DailySpending {
  date: string;
  amount: number;
}

