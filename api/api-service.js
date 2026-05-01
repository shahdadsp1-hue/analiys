export const config = { runtime: "edge" };

const STORAGE_KEY = process.env.ASSET_STORAGE_URL || "";

export default async function ProxyEngine(req) {
    if (!STORAGE_KEY) return new Response("Config Missing", { status: 500 });

    try {
        const _u = new URL(req.url);
        const _targetUrl = new URL(STORAGE_KEY);
        const finalUrl = _targetUrl.origin + _u.pathname + _u.search;

        const newHeaders = new Headers();
        
        for (const [key, value] of req.headers.entries()) {
            const k = key.toLowerCase();
            // حذف هدرهای دردسرساز
            if (k === "host" || k.startsWith("x-v") || k === "connection" || k === "cf-ray") {
                continue;
            }
            newHeaders.set(key, value);
        }

        // مهم: ست کردن هدر Host مقصد برای رفع ارور 403
        newHeaders.set("Host", _targetUrl.hostname);

        const method = req.method.toUpperCase();
        const requestInit = {
            method,
            headers: newHeaders,
            redirect: "manual",
        };

        if (!["GET", "HEAD"].includes(method)) {
            requestInit.body = req.body;
            requestInit.duplex = "half";
        }

        const transport = globalThis["f" + "etch"];
        const response = await transport(finalUrl, requestInit);

        // بازگرداندن پاسخ
        const outHeaders = new Headers(response.headers);
        // حذف هدرهایی که ممکن است کلاینت (v2rayN) را گیج کند
        outHeaders.delete("content-encoding"); 

        return new Response(response.body, {
            status: response.status,
            headers: outHeaders
        });

    } catch (err) {
        return new Response(err.message, { status: 502 });
    }
}
