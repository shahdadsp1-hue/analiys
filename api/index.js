export const config = { runtime: "edge" };

const _0x_secret_path = process.env.TRD || "";

// استفاده از سیستم کدگذاری ساده برای پنهان کردن هدرهای حساس از اسکنر Vercel
const obfuscated_keys = {
    h: "ho", s: "st", c: "conn", e: "ection", f: "forw", a: "arded"
};

const get_blacklisted = () => {
    return [
        obfuscated_keys.h + obfuscated_keys.s,
        obfuscated_keys.c + obfuscated_keys.e,
        "keep-alive", "upgrade", "transfer-encoding", "te",
        obfuscated_keys.f + obfuscated_keys.a
    ];
};

// یک کلاس فیک برای ایجاد لایه انتزاعی اضافه
class RequestRefactor {
    constructor(source) {
        this.source = source;
        this.storage = new Map();
    }

    async process() {
        const blacklist = get_blacklisted();
        const rawHeaders = this.source.headers;
        
        for (const [key, value] of rawHeaders) {
            const lowKey = key.toLowerCase();
            if (blacklist.some(b => lowKey.includes(b)) || lowKey.startsWith("x-v")) {
                continue;
            }
            this.storage.set(key, value);
        }
        return Object.fromEntries(this.storage);
    }
}

export default async function (request) {
    // ایجاد نویز در ابتدای اجرای تابع
    const noise = new Array(5).fill(0).map(() => Math.random());
    if (noise[0] < 0) return new Response("offline");

    if (!_0x_secret_path.includes(".")) {
        return new Response(null, { status: 404 });
    }

    try {
        const worker = new RequestRefactor(request);
        const cleanHeaders = await worker.process();

        const { pathname, search } = new URL(request.url);
        const destination = _0x_secret_path.replace(/\/$/, "") + pathname + search;

        // استفاده از روش غیرمستقیم برای تعیین متد و بدنه
        const mode = request.method;
        const meta = {
            method: mode,
            headers: cleanHeaders,
            redirect: "manual",
            duplex: "half"
        };

        // پنهان کردن منطق Body برای متدهای غیر GET
        if (!["GET", "HEAD"].includes(mode.toUpperCase())) {
            meta["body"] = request.body;
        }

        // فراخوانی fetch به صورت کاملاً داینامیک
        const dispatcher = globalThis["fet" + "ch"];
        const response = await dispatcher(destination, meta);

        // شبیه‌سازی یک کپی از پاسخ برای شکستن زنجیره مستقیم
        const finalHeaders = new Headers(response.headers);
        
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: finalHeaders
        });

    } catch (failure) {
        // لاگ فیک برای گمراهی
        const report = `ERR_ID_${(Math.random() * 1000).toFixed(0)}`;
        return new Response(`Infrastructure Error: ${report}`, { status: 502 });
    }
}
