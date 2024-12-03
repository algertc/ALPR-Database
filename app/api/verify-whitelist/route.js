import { getConfig } from "@/lib/settings";
import { NextResponse } from "next/server";

// Validates IPv4 address format
const isValidIPv4 = (ip) => {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;

  const parts = ip.split(".");
  return parts.every((part) => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
};

// Validates IPv6 address format
const isValidIPv6 = (ip) => {
  // Remove any leading/trailing brackets
  ip = ip.replace(/^\[|\]$/g, "");

  // Handle compressed IPv6 format
  const ipv6Regex =
    /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$/;
  return ipv6Regex.test(ip);
};

// Normalizes an IP address
const normalizeIP = (ip) => {
  ip = ip.trim();

  // Handle IPv4-mapped IPv6 addresses
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }

  // Remove any square brackets from IPv6
  ip = ip.replace(/^\[|\]$/g, "");

  return ip;
};

// Gets client IP from X-Forwarded-For header
const getClientIP = (forwardedFor) => {
  if (!forwardedFor) return null;

  // Split the header into individual IPs
  const ips = forwardedFor.split(",").map((ip) => normalizeIP(ip));

  // Get the leftmost valid IP (original client)
  for (const ip of ips) {
    if (isValidIPv4(ip) || isValidIPv6(ip)) {
      return ip;
    }
  }

  return null;
};

export async function POST(request) {
  try {
    const { headers } = await request.json();
    const forwardedFor = headers["x-forwarded-for"];
    if (!forwardedFor) {
      console.warn("No X-Forwarded-For header present");
      return NextResponse.json({ allowed: false });
    }

    // Get the client IP from X-Forwarded-For header
    const clientIP = getClientIP(forwardedFor);
    if (!clientIP) {
      console.warn("No valid IP found in X-Forwarded-For header");
      return NextResponse.json({ allowed: false });
    }

    console.log("Checking IP:", clientIP);

    // Load the configuration data
    const config = await getConfig();
    const whitelist = config.homeassistant?.whitelist || [];

    if (whitelist.length === 0) {
      console.warn("No whitelisted IPs configured");
      return NextResponse.json({ allowed: false });
    }

    // Normalize all whitelist IPs and compare
    const normalizedWhitelist = whitelist.map(normalizeIP);
    const isAllowedIp = normalizedWhitelist.includes(normalizeIP(clientIP));

    if (!isAllowedIp) {
      console.warn(`IP ${clientIP} is not in the whitelist`);
    }

    return NextResponse.json({ allowed: isAllowedIp });
  } catch (error) {
    console.error("Error checking whitelisted IP:", error);
    return NextResponse.json({ allowed: false }, { status: 500 });
  }
}

