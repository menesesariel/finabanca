import Groq from "groq-sdk";
import { CategoryId, LLMCategorizationResult } from "./types";
import { CATEGORY_LIST } from "./categories";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `Eres un asistente financiero que categoriza transacciones bancarias.
Tu trabajo es analizar el nombre del comercio y determinar la categoría más apropiada.

Categorías disponibles:
${CATEGORY_LIST.map((c) => `- ${c.id}: ${c.name} ${c.icon}`).join("\n")}

Responde ÚNICAMENTE con un objeto JSON válido con este formato:
{
  "categoryId": "food",
  "confidence": 95,
  "reasoning": "Uber Eats es una app de delivery de comida"
}

Reglas:
1. confidence debe ser un número entre 0 y 100
2. Si no estás seguro (< 70%), usa "other" como categoryId
3. Algunos ejemplos:
   - UBER EATS, RAPPI, DIDI FOOD, restaurantes, sodas, cafés → food
   - WALMART, AUTOMERCADO, PRICESMART, MASxMENOS, PALI → supermarket
   - UBER, DIDI, taxi, bus, peajes, parqueos → transport
   - gasolineras, DELTA, UNO, gasolina, combustible → fuel
   - ICE, AyA, CNFL, agua, luz, recibo, internet fijo → utilities
   - alquiler, renta, condominio, mantenimiento del hogar → housing
   - FARMACIA, HOSPITAL, CLINICA, doctor, laboratorio → health
   - cines, bares, conciertos, juegos, streaming puntual → entertainment
   - NETFLIX, SPOTIFY, DISNEY+, HBO, apps y software recurrente → subscriptions
   - AMAZON, ropa, tiendas, tecnología, muebles → shopping
   - EPA, CONSTRUPLAZA, ferretería, materiales, herramientas → hardware
   - barbería, salón, spa, cosméticos, gimnasio → personal_care
   - universidad, colegio, cursos, libros → education
   - veterinaria, alimento para mascotas, PETSTORE → pets
   - KOLBI, LIBERTY, telefonía móvil, seguros, notarios → services`;

export async function categorizeTransaction(
  merchant: string,
  amount?: number,
  currency?: string
): Promise<LLMCategorizationResult> {
  try {
    const userPrompt = `Categoriza esta transacción:
Comercio: "${merchant}"
${amount ? `Monto: ${currency} ${amount.toLocaleString()}` : ""}

Responde solo con JSON.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content || "";
    
    try {
      const result = JSON.parse(responseText);
      
      // Validate response
      const categoryId = validateCategoryId(result.categoryId);
      const confidence = Math.min(100, Math.max(0, Number(result.confidence) || 50));
      
      return {
        categoryId,
        confidence,
        reasoning: result.reasoning,
      };
    } catch (parseError) {
      console.error("Failed to parse LLM response:", responseText);
      return {
        categoryId: "other",
        confidence: 0,
        reasoning: "Error parsing LLM response",
      };
    }
  } catch (error) {
    console.error("LLM categorization error:", error);
    return {
      categoryId: "other",
      confidence: 0,
      reasoning: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
}

function validateCategoryId(id: unknown): CategoryId {
  const validIds: CategoryId[] = [
    "food",
    "supermarket",
    "transport",
    "fuel",
    "utilities",
    "housing",
    "health",
    "entertainment",
    "subscriptions",
    "shopping",
    "hardware",
    "personal_care",
    "education",
    "pets",
    "services",
    "other",
  ];

  if (typeof id === "string" && validIds.includes(id as CategoryId)) {
    return id as CategoryId;
  }

  return "other";
}

/**
 * Batch categorize multiple transactions
 */
export async function categorizeTransactions(
  merchants: string[]
): Promise<LLMCategorizationResult[]> {
  // Process in parallel with rate limiting
  const results: LLMCategorizationResult[] = [];
  const batchSize = 5; // Groq has rate limits

  for (let i = 0; i < merchants.length; i += batchSize) {
    const batch = merchants.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((merchant) => categorizeTransaction(merchant))
    );
    results.push(...batchResults);

    // Small delay between batches to respect rate limits
    if (i + batchSize < merchants.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}

