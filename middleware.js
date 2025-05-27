import { NextResponse } from "next/server";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|grid.svg).*)"],
  runtime: "nodejs", // Keeping this as discussed, assumes Node.js runtime for middleware is feasible
};

export async function middleware(request) {
  console.log(
    `${request.method} ${request.nextUrl.pathname}${request.nextUrl.search}`
  );

  const publicPaths = [
    "/_next",
    "/favicon.ico",
    "/api/plate-reads",
    "/api/verify-session",
    "/api/health-check",
    "/api/verify-key",
    "/api/verify-whitelist",
    "/api/check-update",
    "/api/test",
    "/update",
    "/180.png",
    "/512.png",
    "/192.png",
    "/1024.png",
    "/grid.svg",
    "/manifest.webmanifest",
    "/login",
  ];

  const url = new URL(request.url);
  const queryApiKey = url.searchParams.get("api_key");

  if (queryApiKey) {
    try {
      const response = await fetch(new URL("/api/verify-key", request.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: queryApiKey }),
        signal: AbortSignal.timeout(5000),
      });

      const result = await response.json();
      if (result.valid) {
        const res = NextResponse.next();
        res.headers.set("x-api-key", queryApiKey);
        return res;
      }
    } catch (error) {
      console.error("API key verification error:", error);
    }
  }

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey }),
          signal: AbortSignal.timeout(5000),
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

  // --- REFINED SESSION COOKIE CHECK ---
  const sessionCookie = request.cookies.get("session");
  const sessionId = sessionCookie ? sessionCookie.value : null; // Explicitly get value or null

  console.log(
    `Middleware checking path: ${request.nextUrl.pathname}, Session ID from cookie: ${sessionId}`
  );

  // SPECIAL HANDLING FOR LOGIN PAGE
  if (request.nextUrl.pathname === "/login") {
    if (sessionId) {
      // Check if sessionId exists
      try {
        const response = await fetch(
          new URL("/api/verify-session", request.url),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }), // Pass sessionId directly
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
        const res = NextResponse.next();
        res.cookies.delete("session"); // Clear potentially invalid session
        return res;
      }
    }
    return NextResponse.next(); // No valid session, allow access to login page
  }

  // For all other protected routes, check authentication
  if (!sessionId) {
    // Now this check should correctly reflect if a session ID was found
    console.log(
      "No session ID found in cookie. Checking IP whitelist or redirecting to login."
    );
    // Check IP whitelist (existing logic, kept as is)
    try {
      const isWhitelistedIpResponse = await fetch(
        new URL("/api/verify-whitelist", request.url),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ip: request.ip,
            headers: Object.fromEntries(request.headers),
          }),
          signal: AbortSignal.timeout(5000),
        }
      );

      if (isWhitelistedIpResponse.ok) {
        const isWhitelistedIp = (await isWhitelistedIpResponse.json()).allowed;
        if (isWhitelistedIp) {
          console.log("IP whitelisted, allowing access.");
          return NextResponse.next();
        }
      }
    } catch (error) {
      console.error("IP whitelist check error:", error);
    }

    console.log("No session or IP not whitelisted, redirecting to /login.");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Session verification for protected routes
  try {
    const response = await fetch(new URL("/api/verify-session", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }), // Pass sessionId directly
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(
        `Session verification request failed: ${response.status} for path: ${request.nextUrl.pathname}`
      );
      if (response.status >= 400 && response.status < 500) {
        console.log(
          "Client error during session verification, redirecting to login and clearing cookie."
        );
        const res = NextResponse.redirect(new URL("/login", request.url));
        res.cookies.delete("session");
        return res;
      } else {
        console.log(
          "Server error during session verification, allowing access to prevent random logouts."
        );
        return NextResponse.next();
      }
    }

    const result = await response.json();

    if (!result.valid) {
      console.log(
        "Invalid session for protected route, clearing cookie and redirecting to login."
      );
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.cookies.delete("session");
      return res;
    }

    if (!request.nextUrl.pathname.startsWith("/api/")) {
      try {
        const updateResponse = await fetch(
          new URL("/api/check-update", request.url),
          { signal: AbortSignal.timeout(5000) }
        );
        if (updateResponse.ok) {
          const updateData = await updateResponse.json();
          if (updateData.updateRequired) {
            return NextResponse.redirect(new URL("/update", request.url));
          }
        }
      } catch (error) {
        console.error("Update check error:", error);
      }
    }
    return NextResponse.next();
  } catch (error) {
    console.error("Session verification fetch error in middleware:", error);
    if (error.name === "AbortError") {
      console.log(
        "Session verification timeout, allowing access to prevent logout."
      );
    } else {
      console.log(
        "Network error during session verification, allowing access."
      );
    }
    return NextResponse.next();
  }
}
