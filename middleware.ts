import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * ต่ออายุ session ให้หน้าที่ render ฝั่ง server (หลังบ้าน) เพราะ server component เขียน cookie เองไม่ได้
 * จำกัดเฉพาะ /admin — หน้าร้านยังเป็น static ไม่มี middleware มาคั่น
 */
export const config = { matcher: ["/admin/:path*"] };

export async function middleware(req: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const login = () => {
    const to = req.nextUrl.clone();
    to.pathname = "/login";
    to.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(to);
  };
  if (!url || !anon) return login();

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of list) {
          res.cookies.set(name, value, { ...options, httpOnly: true, sameSite: "lax" });
        }
      },
    },
  });

  // getUser ตรวจ token กับ Supabase Auth และ refresh ให้เมื่อหมดอายุ
  const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  return data.user ? res : login();
}
