import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listBankEmails } from "@/lib/gmail";
import { parseTransactionEmail } from "@/lib/parsers";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const maxResults = parseInt(searchParams.get("maxResults") || "20", 10);
    const afterDateStr = searchParams.get("afterDate");
    const afterDate = afterDateStr ? new Date(afterDateStr) : undefined;

    // Fetch emails from Gmail
    const emails = await listBankEmails(session.accessToken, {
      maxResults,
      afterDate,
      bankEmails: [
        "Alertas@davibank.cr",
        "AlertasScotiabank@scotiabank.com",
        "notificacion@baccredomatic.cr",
      ],
    });

    // Parse each email
    const parsedEmails = emails.map((email) => {
      const result = parseTransactionEmail({
        id: email.id,
        from: email.from,
        subject: email.subject,
        body: email.body,
        date: email.date,
      });

      return {
        emailId: email.id,
        from: email.from,
        subject: email.subject,
        date: email.date,
        snippet: email.snippet,
        parsed: result,
      };
    });

    return NextResponse.json({
      success: true,
      count: parsedEmails.length,
      emails: parsedEmails,
    });
  } catch (error) {
    console.error("Gmail API error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch emails",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

