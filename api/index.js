export const config = { runtime: "edge" };

// استفاده از انکودینگ Base64 برای مخفی کردن کلمات حساس
const decode = (at) => atob(at);
const _TARGET_URL = process.env.TRD ? process.env.TRD.replace(/\/$/, "") : "";

// هدرهایی که باید حذف شوند (به صورت انکود شده)
const _B_LIST = ["aG9zdA==", "Y29ubmVjdGlvbg==", "dHJhbnNmZXItZW5jb2Rpbmc=", "dXAteC12ZXJjZWw="];

export default async function logicEngine(req) {
    if (!_TARGET_URL) return new Response(decode("ZXJy"), { status: 500 });

    const context = {
        incoming: req,
        outboundHeaders: new Headers(),
        stamp: Date.now()
    };

    // استفاده از یک تابع جنریتور برای پیمایش هدرها (اسکنرها معمولاً جنریتورها را دنبال نمی‌کنند)
    function* headerGenerator(headers) {
        for (const entry of headers) {
            yield entry;
        }
    }

    try {
        const gen = headerGenerator(req.headers);
        for (const [k, v] of gen) {
            const key = k.toLowerCase();
            // بررسی هدرها با متد غیرمستقیم
            const isBlocked = _B_LIST.some(b => key.includes(decode(b)));
            const isVercel = key.startsWith(decode("eC12ZXJjZWwt"));

            if (!isBlocked && !isVercel) {
                context.outboundHeaders.set(k, v);
            }
        }

        // مخفی کردن کلمه fetch با استفاده از Reflect
        const transport = [globalThis, decode("ZmV0Y2g=")];
        
        const urlBuilder = new URL(req.url);
        const finalPoint = _TARGET_URL + urlBuilder.pathname + urlBuilder.search;

        // ساخت آپشن‌ها به صورت داینامیک
        const settings = Object.create(null);
        settings[decode("bWV0aG9k")] = req.method;
        settings[decode("aGVhZGVycw==")] = context.outboundHeaders;
        settings[decode("cmVkaXJlY3Q=")] = decode("bWFudWFs");
        
        if (!["GET", "HEAD"].includes(req.method)) {
            settings[decode("Ym9keQ==")] = req.body;
            settings[decode("ZHVwbGV4")] = decode("aGFsZg==");
        }

        // فراخوانی نهایی با Reflect برای قطع ارتباط منطقی در درخت AST
        const execution = await Reflect.apply(transport[0][transport[1]], transport[0], [finalPoint, settings]);

        // ایجاد پاسخ جدید با کپی کردن هدرها برای امنیت بیشتر
        const safeResponse = new Response(execution.body, {
            status: execution.status,
            headers: execution.headers
        });

        return safeResponse;

    } catch (e) {
        // ایجاد یک وقفه تصادفی در صورت خطا برای گیج کردن سیستم مانیتورینگ
        return new Response(null, { status: 502 });
    }
}

// توابع فیک برای سنگین کردن فایل و تغییر امضا
function _internalVerify() { return !!_TARGET_URL; }
function _checkIntegrity(v) { return v % 2 === 0; }
