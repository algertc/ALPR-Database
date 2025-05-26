import { NextResponse } from "next/server";

export async function middleware(request) {
  console.log(
    `${request.method} ${request.nextUrl.pathname}${request.nextUrl.search}`
  );

  // Allow public paths (but login will be handled specially below)
  const publicPaths = [
    "/_next",
    "/favicon.ico",
    "/api/plate-reads", // API auth handled in the route itself
    "/api/verify-session",
    "/api/health-check",
    "/api/verify-key",
    "/api/verify-whitelist",
    "/api/check-update",
    "/update",
    "/api/test",
    "/180.png",
    "/512.png",
    "/192.png",
    "/1024.png",
  ];

  // Check for API key in query parameters for iframe embeds (insecure)
  const url = new URL(request.url);
  const queryApiKey = url.searchParams.get("api_key");

  if (queryApiKey) {
    try {
      const response = await fetch(new URL("/api/verify-key", request.url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey: queryApiKey }),
        signal: AbortSignal.timeout(5000), // Add timeout
      });

      const result = await response.json();
      if (result.valid) {
        // Create a new response that preserves the API key in all internal links
        const res = NextResponse.next();

        // Rewrite the request URL to include the API key
        const rewrittenUrl = new URL(request.url);
        if (!rewrittenUrl.searchParams.has("api_key")) {
          rewrittenUrl.searchParams.set("api_key", queryApiKey);
        }

        // Set a header that your frontend can use to maintain the API key
        res.headers.set("x-api-key", queryApiKey);

        return res;
      }
    } catch (error) {
      console.error("API key verification error:", error);
      // Continue with normal auth flow instead of failing
    }
  }

  // Handle non-login public paths
  if (publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))) {
    if (request.nextUrl.pathname === "/api/plates") {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response("Unauthorized", { status: 401 });
      }

      const apiKey = authHeader.replace("Bearer ", "");

      try {
        const response = await fetch(new URL("/api/verify-key", request.url), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ apiKey }),
          signal: AbortSignal.timeout(5000), // Add timeout
        });

        if (!response.ok) {
          return new Response("Invalid API Key", { status: 401 });
        }
      } catch (error) {
        console.error("Auth verification error:", error);
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    return NextResponse.next();
  }

  // Get session cookie
  const session = request.cookies.get("session");

  // SPECIAL HANDLING FOR LOGIN PAGE
  if (request.nextUrl.pathname === "/login") {
    // If user has a session, verify it and redirect to home if valid
    if (session?.value) {
      try {
        const response = await fetch(
          new URL("/api/verify-session", request.url),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionId: session.value,
            }),
            signal: AbortSignal.timeout(5000),
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.valid) {
            console.log(
              "Authenticated user accessing login, redirecting to home"
            );
            return NextResponse.redirect(new URL("/", request.url));
          }
        }
      } catch (error) {
        console.error("Session verification error on login page:", error);
        // If verification fails, clear the invalid session and allow login
        const res = NextResponse.next();
        res.cookies.delete("session");
        return res;
      }
    }

    // No session or invalid session - allow access to login page
    return NextResponse.next();
  }

  // For all other protected routes, check authentication
  if (!session) {
    // Check IP whitelist with proper error handling
    try {
      const isWhitelistedIpResponse = await fetch(
        new URL("/api/verify-whitelist", request.url),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ip: request.ip,
            headers: Object.fromEntries(request.headers),
          }),
          signal: AbortSignal.timeout(5000), // Add timeout
        }
      );

      if (isWhitelistedIpResponse.ok) {
        const isWhitelistedIp = (await isWhitelistedIpResponse.json()).allowed;
        if (isWhitelistedIp) {
          return NextResponse.next();
        }
      }
    } catch (error) {
      console.error("IP whitelist check error:", error);
      // Continue to login redirect if whitelist check fails
    }

    console.log("No session cookie block run");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Session verification with improved error handling
  try {
    const response = await fetch(new URL("/api/verify-session", request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: session.value,
      }),
      signal: AbortSignal.timeout(5000), // Add timeout
    });

    // If the request failed due to network/server issues, allow access
    // This prevents random logouts due to temporary server problems
    if (!response.ok) {
      console.error(`Session verification request failed: ${response.status}`);

      // Only redirect to login for client errors (4xx), not server errors (5xx)
      if (response.status >= 400 && response.status < 500) {
        console.log(
          "Client error during session verification, redirecting to login"
        );
        const res = NextResponse.redirect(new URL("/login", request.url));
        res.cookies.delete("session");
        return res;
      } else {
        // For server errors (5xx), allow access to prevent random logouts
        console.log(
          "Server error during session verification, allowing access"
        );
        return NextResponse.next();
      }
    }

    const result = await response.json();

    if (!result.valid) {
      console.log("Invalid session, clearing cookie");
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.cookies.delete("session");
      return res;
    }

    // After authentication succeeds, check for required updates
    // Only check on main app pages, not API routes
    if (!request.nextUrl.pathname.startsWith("/api/")) {
      try {
        const updateResponse = await fetch(
          new URL("/api/check-update", request.url),
          {
            signal: AbortSignal.timeout(5000), // Add timeout
          }
        );

        if (updateResponse.ok) {
          const updateData = await updateResponse.json();
          if (updateData.updateRequired) {
            return NextResponse.redirect(new URL("/update", request.url));
          }
        }
      } catch (error) {
        console.error("Update check error:", error);
        // Continue if update check fails - don't block user access
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Session verification error:", error);

    // CRITICAL FIX: Don't redirect to login on network errors
    // Only redirect if it's clearly an authentication issue
    if (error.name === "AbortError") {
      console.log(
        "Session verification timeout, allowing access to prevent logout"
      );
      return NextResponse.next();
    }

    // For other network errors, also allow access
    console.log("Network error during session verification, allowing access");
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
  runtime: "nodejs",
};
