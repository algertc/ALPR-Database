// app/api/verify-session/route.js (Re-introduced and improved)
import { verifySession, getSessionInfo, initializeAuth } from "@/lib/auth"; // Import initializeAuth
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Ensures this route is not cached
export const runtime = "nodejs"; // Explicitly run this API route in Node.js runtime

export async function POST(req) {
  // Ensure auth system is initialized before proceeding
  try {
    await initializeAuth();
  } catch (initError) {
    console.error(
      "Auth initialization failed in /api/verify-session:",
      initError
    );
    return new NextResponse(
      JSON.stringify({
        valid: false,
        message: "Authentication system initialization error",
      }),
      { status: 500 }
    );
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return new NextResponse(
        JSON.stringify({ valid: false, message: "Session ID is required" }),
        { status: 400 }
      );
    }

    const isValid = await verifySession(sessionId);
    const sessionInfo = isValid ? await getSessionInfo(sessionId) : null;

    return new NextResponse(
      JSON.stringify({
        valid: isValid,
        sessionInfo: sessionInfo,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/verify-session:", error);
    // Be careful with error messages in production to avoid leaking info
    return new NextResponse(
      JSON.stringify({
        valid: false,
        message: "Internal server error during session verification",
      }),
      { status: 500 }
    );
  }
}
