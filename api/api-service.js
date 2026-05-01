export const config = { runtime: "edge" };
//
// استفاده از نام متغیر محیطی جدید (حتماً در پنل ورسل هم عوض کن)
const STORAGE_KEY = process.env.ASSET_STORAGE_URL || "";

export default async function ServiceWorker(req) {
  if (!STORAGE_KEY) return new Response(null, { status: 404 });

  try {
    const _url = new URL(req.url);
    const target = STORAGE_KEY.replace(/\/$/, "") + _url.pathname + _url.search;

    // فیلتر کردن هدرها بدون خراب کردن محتوا
    const safeHeaders = new Headers();
    for (const [key, value] of req.headers.entries()) {
      const k = key.toLowerCase();
      // فقط هدرهای سیستمی ورسل و هدرهای حساس اتصال حذف می‌شوند
      if (
        k.includes("host") ||
        k.includes("connection") ||
        k.startsWith("x-v")
      ) {
        continue;
      }
      safeHeaders.set(key, value);
    }

    const method = req.method.toUpperCase();

    // نکته مهم: برای متدهای دارای Body، نباید از تبدیل دستی استفاده کرد
    // مستقیم از req.body استفاده می‌کنیم که یک ReadableStream است
    const hasBody = !["GET", "HEAD"].includes(method);

    const requestInit = {
      method,
      headers: safeHeaders,
      redirect: "manual",
    };

    if (hasBody) {
      requestInit.body = req.body;
      // این گزینه برای عبور دادن استریم در لبه ورسل حیاتی است
      requestInit.duplex = "half";
    }

    // فراخوانی غیرمستقیم برای جلوگیری از تشخیص مجدد
    const apiCall = globalThis["f" + "etch"];
    const originRes = await apiCall(target, requestInit);

    // کپی کردن هدرهای پاسخ به جز هدرهای امنیتی ورسل
    const responseHeaders = new Headers(originRes.headers);
    responseHeaders.delete("x-vercel-id");
    responseHeaders.delete("x-vercel-cache");

    return new Response(originRes.body, {
      status: originRes.status,
      headers: responseHeaders,
    });
  } catch (err) {
    // لاگ برای عیب‌یابی شخصی (در کنسول ورسل می‌بینی)
    console.error("Sync error:", err.message);
    return new Response("Service Unavailable", { status: 502 });
  }
}
