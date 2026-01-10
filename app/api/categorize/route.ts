import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { categorizeTransaction } from "@/lib/llm";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { merchant, amount, currency } = body;

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant is required" },
        { status: 400 }
      );
    }

    const result = await categorizeTransaction(merchant, amount, currency);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Categorization error:", error);
    return NextResponse.json(
      {
        error: "Failed to categorize",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

