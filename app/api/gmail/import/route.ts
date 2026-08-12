import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listBankEmails } from "@/lib/gmail";
import { parseTransactionEmail } from "@/lib/parsers";
import { formatDateForGmail } from "@/lib/date-ranges";

// Historical imports fetch many full email bodies; give the function room so it
// doesn't hit the default serverless timeout for heavy accounts.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      senders = [
        "Alertas@davibank.cr",
        "AlertasScotiabank@scotiabank.com",
        "notificacion@baccredomatic.cr",
      ],
      startDate, 
      endDate,
      maxResults = 500 
    } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    console.log("Import request:", { senders, startDate, endDate, maxResults });

    // Fetch emails from Gmail with date range
    const emails = await listBankEmails(session.accessToken, {
      maxResults,
      bankEmails: senders,
      afterDate: new Date(startDate),
      beforeDate: new Date(endDate),
    });

    console.log(`Fetched ${emails.length} emails from Gmail`);

    // No need to filter by end date anymore - done in the query
    const filteredEmails = emails;

    // Parse each email
    const results = filteredEmails.map((email) => {
      const parseResult = parseTransactionEmail({
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
        parsed: parseResult,
      };
    });

    // Separate successful and failed parses
    const successful = results.filter((r) => r.parsed.success);
    const failed = results.filter((r) => !r.parsed.success);

    return NextResponse.json({
      success: true,
      total: results.length,
      successfulCount: successful.length,
      failedCount: failed.length,
      emails: results,
    });
  } catch (error) {
    console.error("Gmail import error:", error);
    return NextResponse.json(
      {
        error: "Failed to import emails",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

