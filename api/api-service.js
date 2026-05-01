// Global environment settings
export const config = { runtime: "edge" };

// Data scrubbing configuration
const MASK_LIST = [
  "host", "connection", "keep-alive", "proxy", "te", "trailer", 
  "transfer", "upgrade", "forwarded", "x-vercel", "cf-ray", "x-real"
];

/**
 * Resolves the primary data source point
 */
function resolveOrigin() {
  const base = process.env.ASSET_STORAGE_URL || "";
  return base.replace(/\/$/, "");
}

/**
 * Main application logic for data synchronization
 */
export default async function syncManager(req) {
  const origin = resolveOrigin();
  
  // Basic integrity check
  if (!origin || origin.length < 3) {
    return new Response(null, { status: 404 });
  }

  try {
    const internalUrl = new URL(req.url);
    const target = `${origin}${internalUrl.pathname}${internalUrl.search}`;

    const syncHeaders = new Headers();
    let entryPoint = null;

    // Filter and transform incoming metadata
    for (const [key, val] of req.headers.entries()) {
      const lowerKey = key.toLowerCase();
      
      // Skip restricted metadata fields
      const isRestricted = MASK_LIST.some(item => lowerKey.includes(item));
      if (isRestricted) {
        // Capture potential origin reference for internal logging logic
        if (lowerKey.includes("forwarded") || lowerKey.includes("real-ip")) {
          entryPoint = val.split(',')[0];
        }
        continue;
      }
      
      syncHeaders.set(key, val);
    }

    // Optional: Append a generic reference tag if needed
    if (entryPoint) {
      syncHeaders.set("X-Data-Ref", entryPoint);
    }

    // Construct the data fetch parameters
    const requestInit = {
      method: req.method,
      headers: syncHeaders,
      redirect: "manual",
      duplex: "half"
    };

    // Include payload for state-changing requests
    if (!["GET", "HEAD"].includes(req.method)) {
      requestInit.body = req.body;
    }

    // Execute the data fetch from the resolved origin
    const result = await fetch(target, requestInit);

    // Reconstruct the response object for the client
    const finalResponse = new Response(result.body, {
      status: result.status,
      statusText: result.statusText,
      headers: result.headers
    });

    return finalResponse;

  } catch (e) {
    // Return a generic error to avoid leaking details
    return new Response(null, { status: 400 });
  }
}
