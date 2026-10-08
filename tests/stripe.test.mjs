// ทดสอบ lib/stripe.ts กับ Stripe จำลองในเครื่อง — ไม่เรียก Stripe จริง ไม่ใช้ key จริง
// รัน: pnpm test
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import { after, before, test } from "node:test";

const SECRET = "sk_test_unit";
const WEBHOOK_SECRET = "whsec_unit";

/** คำขอที่ Stripe จำลองได้รับ และคำตอบที่จะส่งกลับในคำขอถัดไป */
const calls = [];
let reply = { status: 200, body: {} };

const server = createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    calls.push({ method: req.method, path: req.url, auth: req.headers.authorization, form: new URLSearchParams(raw) });
    res.writeHead(reply.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(reply.body));
  });
});

/** โหลด lib/stripe.ts ใหม่ด้วยค่า env ชุดนี้ (โมดูลอ่าน env ตอนโหลด) */
let loads = 0;
async function loadStripe(env) {
  for (const key of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]) {
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  return import(`../lib/stripe.ts?load=${++loads}`);
}

const sign = (payload, secret = WEBHOOK_SECRET, time = Math.floor(Date.now() / 1000)) =>
  `t=${time},v1=${createHmac("sha256", secret).update(`${time}.${payload}`).digest("hex")}`;

let stripe;

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.STRIPE_API_BASE = `http://127.0.0.1:${server.address().port}`;
  stripe = await loadStripe({ STRIPE_SECRET_KEY: SECRET, STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET });
});

after(() => server.close());

test("เปิดใช้ Stripe เมื่อมี secret key และรู้ว่าเป็นโหมดทดสอบ", async () => {
  assert.equal(stripe.isStripeEnabled, true);
  assert.equal(stripe.isStripeTestMode, true);
  assert.equal(stripe.isStripeWebhookEnabled, true);

  const live = await loadStripe({ STRIPE_SECRET_KEY: "sk_live_unit" });
  assert.equal(live.isStripeEnabled, true);
  assert.equal(live.isStripeTestMode, false);
  assert.equal(live.isStripeWebhookEnabled, false);

  const off = await loadStripe({});
  assert.equal(off.isStripeEnabled, false);
  assert.equal(off.isStripeTestMode, false);
});

test("สร้างหน้าชำระเงิน: ทั้งตะกร้าจ่ายครั้งเดียว ยอดเป็นสตางค์ สกุลเงินบาท", async () => {
  calls.length = 0;
  reply = { status: 200, body: { id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" } };
  const startedAt = Math.floor(Date.now() / 1000);

  const session = await stripe.createCheckoutSession({
    cartNo: "VX-1001",
    orderNos: ["VX-1001", "VX-1001-2"],
    lines: [
      { name: "Notion OS", amount: 590 },
      { name: "UI Kit", amount: 349.5 },
    ],
    email: "buyer@example.com",
    successUrl: "https://shop.test/pay/return?session_id={CHECKOUT_SESSION_ID}",
    cancelUrl: "https://shop.test/checkout",
  });

  assert.equal(session.url, "https://checkout.stripe.com/c/pay/cs_test_1");
  assert.equal(calls.length, 1);
  const { method, path, auth, form } = calls[0];
  assert.equal(method, "POST");
  assert.equal(path, "/v1/checkout/sessions");
  assert.equal(auth, `Bearer ${SECRET}`);
  assert.equal(form.get("mode"), "payment");
  assert.equal(form.get("client_reference_id"), "VX-1001");
  assert.equal(form.get("customer_email"), "buyer@example.com");
  assert.equal(form.get("metadata[orders]"), "VX-1001,VX-1001-2");
  assert.equal(form.get("line_items[0][price_data][unit_amount]"), "59000");
  assert.equal(form.get("line_items[1][price_data][unit_amount]"), "34950");
  assert.equal(form.get("line_items[0][price_data][currency]"), "thb");
  assert.equal(form.get("line_items[1][price_data][product_data][name]"), "UI Kit");
  assert.equal(form.get("line_items[1][quantity]"), "1");
  // ไม่ล็อกวิธีจ่าย: Stripe แสดงทุกวิธีที่เปิดไว้ใน Dashboard
  assert.equal(form.has("payment_method_types[0]"), false);

  const lifetime = Number(form.get("expires_at")) - startedAt;
  assert.ok(lifetime >= 30 * 60 && lifetime <= 24 * 60 * 60, `expires_at อยู่นอกช่วงที่ Stripe รับ (${lifetime}s)`);
});

test("ชื่อสินค้ายาวเกินถูกตัดให้ไม่เกิน 250 ตัวอักษร", async () => {
  calls.length = 0;
  reply = { status: 200, body: { id: "cs_test_2", url: null } };
  await stripe.createCheckoutSession({
    cartNo: "VX-1002", orderNos: ["VX-1002"], lines: [{ name: "x".repeat(400), amount: 100 }],
    email: "buyer@example.com", successUrl: "https://shop.test/ok", cancelUrl: "https://shop.test/no",
  });
  assert.equal(calls[0].form.get("line_items[0][price_data][product_data][name]").length, 250);
});

test("Stripe ตอบ error: โยน error พร้อมรหัสจาก Stripe (ไม่ถือว่าสร้างสำเร็จ)", async () => {
  reply = { status: 400, body: { error: { code: "amount_too_small", message: "Amount must be at least ฿10.00 thb" } } };
  await assert.rejects(
    stripe.createCheckoutSession({
      cartNo: "VX-1003", orderNos: ["VX-1003"], lines: [{ name: "Tiny", amount: 1 }],
      email: "buyer@example.com", successUrl: "https://shop.test/ok", cancelUrl: "https://shop.test/no",
    }),
    /stripe amount_too_small/
  );
});

test("อ่านสถานะหน้าชำระเงินจาก Stripe ด้วย secret key", async () => {
  calls.length = 0;
  reply = { status: 200, body: { id: "cs_test_9", payment_status: "paid", amount_total: 59000, currency: "thb" } };
  const session = await stripe.getCheckoutSession("cs_test_9");
  assert.equal(session.payment_status, "paid");
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[0].path, "/v1/checkout/sessions/cs_test_9");
  assert.equal(calls[0].auth, `Bearer ${SECRET}`);
});

test("ยกเลิกคำสั่งซื้อ: ปิดเฉพาะหน้าชำระเงินที่ยังเปิดอยู่ของคำสั่งซื้อนั้น", async () => {
  calls.length = 0;
  reply = { status: 200, body: { data: [
    { id: "cs_a", client_reference_id: "VX-2001" },
    { id: "cs_b", client_reference_id: "VX-9999" },
    { id: "cs_c", client_reference_id: "VX-2001" },
  ] } };
  assert.equal(await stripe.expireOpenSessions("VX-2001"), 2);
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[0].path, "/v1/checkout/sessions?status=open&limit=100");
  const expired = calls.slice(1).map((c) => `${c.method} ${c.path}`).sort();
  assert.deepEqual(expired, ["POST /v1/checkout/sessions/cs_a/expire", "POST /v1/checkout/sessions/cs_c/expire"]);
});

test("ยกเลิกคำสั่งซื้อ: ไม่มีหน้าชำระเงินค้างอยู่ก็ไม่เรียกปิด", async () => {
  calls.length = 0;
  reply = { status: 200, body: { data: [{ id: "cs_b", client_reference_id: "VX-9999" }] } };
  assert.equal(await stripe.expireOpenSessions("VX-2001"), 0);
  assert.equal(calls.length, 1);
});

const EVENT = JSON.stringify({
  type: "checkout.session.completed",
  data: { object: { id: "cs_test_1", payment_status: "paid", client_reference_id: "VX-1001" } },
});

test("webhook: ลายเซ็นถูกต้อง -> ได้ event", () => {
  const event = stripe.readWebhook(EVENT, sign(EVENT));
  assert.equal(event?.type, "checkout.session.completed");
  assert.equal(event?.data.object.client_reference_id, "VX-1001");
});

test("webhook: เนื้อหาถูกแก้หลังเซ็น -> ไม่รับ", () => {
  const forged = EVENT.replace("VX-1001", "VX-9999");
  assert.equal(stripe.readWebhook(forged, sign(EVENT)), null);
});

test("webhook: เซ็นด้วย secret อื่น -> ไม่รับ", () => {
  assert.equal(stripe.readWebhook(EVENT, sign(EVENT, "whsec_attacker")), null);
});

test("webhook: คำขอเก่าเกิน 5 นาที -> ไม่รับ (กันยิงซ้ำ)", () => {
  const old = Math.floor(Date.now() / 1000) - 6 * 60;
  assert.equal(stripe.readWebhook(EVENT, sign(EVENT, WEBHOOK_SECRET, old)), null);
});

test("webhook: ไม่มีลายเซ็น หรือลายเซ็นผิดรูปแบบ -> ไม่รับ", () => {
  assert.equal(stripe.readWebhook(EVENT, null), null);
  assert.equal(stripe.readWebhook(EVENT, ""), null);
  assert.equal(stripe.readWebhook(EVENT, "garbage"), null);
  assert.equal(stripe.readWebhook(EVENT, `t=${Math.floor(Date.now() / 1000)},v1=`), null);
});

test("webhook: เซ็นถูกแต่เนื้อหาไม่ใช่ JSON -> ไม่รับ", () => {
  assert.equal(stripe.readWebhook("not json", sign("not json")), null);
});

test("webhook: ยังไม่ได้ตั้ง STRIPE_WEBHOOK_SECRET -> ไม่รับทุกคำขอ", async () => {
  const noHook = await loadStripe({ STRIPE_SECRET_KEY: SECRET });
  assert.equal(noHook.readWebhook(EVENT, sign(EVENT)), null);
  assert.equal(noHook.readWebhook(EVENT, sign(EVENT, "")), null);
});
