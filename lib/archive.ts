/**
 * เนื้อหาในหน้า Archive (บทความ บันทึกการออกแบบ ไกด์ และอัปเดตสินค้า)
 * เก็บเป็นไฟล์ในโปรเจกต์ ไม่ต้องมีตารางในฐานข้อมูล
 * type: story | note | guide | article | update
 */
import type { Article, ArticleType } from "@/lib/types";

export const ARCHIVE_TYPES: ArticleType[] = ["story", "note", "guide", "article", "update"];

export const ARCHIVE: Article[] = [
  {
    slug: "building-mission-control-os",
    type: "story",
    date: "2026-09-18",
    read: 7,
    product: "mission-control-os",
    author: "Halyard Systems",
    title_th: "ระบบที่เริ่มจากสเปรดชีตเดียว",
    title_en: "A system that started as one spreadsheet",
    dek_th: "Mission Control OS เกิดจากการพยายามตอบคำถามเดียว: สัปดาห์นี้ทีมเราทำอะไรไปบ้าง",
    dek_en: "Mission Control OS began as an attempt to answer one question: what did our team actually ship this week?",
    body_th: [
      "สามปีก่อน เราดูแลงานลูกค้าเจ็ดรายด้วยสเปรดชีตไฟล์เดียว ทุกเช้าวันจันทร์ต้องใช้เวลาเกือบชั่วโมงเพื่อรวบรวมว่าใครทำอะไรค้างอยู่",
      "เวอร์ชันแรกของระบบจึงมีแค่สามตาราง: เป้าหมาย โปรเจกต์ และงาน ทุกอย่างที่ตามมาเพิ่มเข้าไปก็ต่อเมื่อเราใช้แล้วรู้สึกว่าขาดจริง ๆ",
      "เวอร์ชัน 2.4 เพิ่มบันทึกการตัดสินใจ เพราะเราพบว่าคำถามที่ถามซ้ำบ่อยที่สุดไม่ใช่ 'ทำอะไรอยู่' แต่เป็น 'ทำไมเราถึงเลือกแบบนี้'",
    ],
    body_en: [
      "Three years ago we ran seven client projects from a single spreadsheet. Every Monday took nearly an hour just to work out who had what in flight.",
      "So the first version of the system had three tables: goals, projects and tasks. Anything added after that had to earn its place by being missed in real use.",
      "Version 2.4 adds a decision log, because the question we were asked most was never 'what are you doing' — it was 'why did we choose this'.",
    ],
  },
  {
    slug: "contrast-is-a-spec",
    type: "note",
    date: "2026-09-04",
    read: 5,
    product: "meridian-design-system",
    author: "Meridian UI",
    title_th: "Contrast คือสเปก ไม่ใช่ความชอบ",
    title_en: "Contrast is a spec, not a preference",
    dek_th: "เราตรวจทุกคู่สีใน Meridian ก่อนออกแบบคอมโพเนนต์ ไม่ใช่หลังจากนั้น",
    dek_en: "We check every colour pairing in Meridian before designing components, not after.",
    body_th: [
      "ความผิดพลาดที่พบบ่อยที่สุดในระบบออกแบบคือการเลือกสีให้สวยก่อน แล้วค่อยมาแก้ contrast ทีหลัง ซึ่งมักจบด้วยการเพิ่มสีพิเศษทีละสี",
      "ใน Meridian 3.1 เรากำหนดคู่สีที่อนุญาตไว้ในตาราง token ตั้งแต่ต้น คอมโพเนนต์ใช้ได้เฉพาะคู่ที่ผ่าน WCAG AA เท่านั้น",
      "ผลคือจำนวนสีลดลงเกือบครึ่ง และแทบไม่มีคำถามว่า 'ปุ่มนี้ควรใช้สีไหน' อีกเลย",
    ],
    body_en: [
      "The most common failure in a design system is picking colours for looks and fixing contrast later — usually by bolting on one special-case shade at a time.",
      "In Meridian 3.1 the permitted pairings live in the token table from day one. Components may only use pairs that pass WCAG AA.",
      "The palette shrank by almost half, and the question 'which colour does this button use?' more or less disappeared.",
    ],
  },
  {
    slug: "how-to-write-an-rfc",
    type: "guide",
    date: "2026-08-21",
    read: 9,
    product: "technical-writing-manual",
    author: "Field Manual Press",
    title_th: "เขียน RFC ให้ทีมตัดสินใจได้ใน 20 นาที",
    title_en: "Write an RFC your team can decide on in 20 minutes",
    dek_th: "โครงสร้างห้าส่วนที่เราใช้กับทุกเอกสารข้อเสนอ",
    dek_en: "The five-part structure we use for every proposal document.",
    body_th: [
      "RFC ที่ดีไม่ได้ยาว แต่ทำให้คนอ่านรู้ว่าต้องตัดสินใจเรื่องอะไร และมีข้อมูลพอจะตัดสินใจได้",
      "เริ่มจากหนึ่งประโยคที่บอกว่าขออนุมัติอะไร ตามด้วยปัญหา ทางเลือกที่พิจารณา ข้อเสนอ และสิ่งที่ยังไม่รู้",
      "ส่วนสุดท้ายสำคัญที่สุด การบอกตรง ๆ ว่ายังไม่แน่ใจตรงไหนทำให้การรีวิวไปถึงประเด็นจริงเร็วขึ้นมาก",
    ],
    body_en: [
      "A good RFC isn't long. It tells the reader what they are being asked to decide, and gives them enough to decide it.",
      "Open with one sentence naming the decision, then the problem, the options considered, the proposal, and what is still unknown.",
      "That last section matters most. Saying plainly where you're unsure gets the review to the real issue much faster.",
    ],
  },
  {
    slug: "launchpad-1-6",
    type: "update",
    date: "2026-09-20",
    read: 3,
    product: "launchpad-starter",
    author: "Northline Dev",
    title_th: "Launchpad 1.6: อัปเกรด Next.js และเทสต์ที่เร็วขึ้น",
    title_en: "Launchpad 1.6: framework upgrade and faster tests",
    dek_th: "ผู้ที่ซื้อแล้วดาวน์โหลดเวอร์ชันใหม่ได้จากคลังของคุณ",
    dek_en: "Existing owners can download the new version from their library.",
    body_th: [
      "เวอร์ชันนี้อัปเกรดเฟรมเวิร์ก ย้ายเทสต์ end-to-end ไปรันแบบขนาน และลดเวลา CI จาก 9 นาทีเหลือ 4 นาที",
      "ไม่มีการเปลี่ยนแปลงที่ทำให้โค้ดเดิมใช้ไม่ได้ ดูรายละเอียดการย้ายเวอร์ชันได้ใน CHANGELOG.md",
    ],
    body_en: [
      "This release upgrades the framework, runs end-to-end tests in parallel, and cuts CI time from 9 minutes to 4.",
      "There are no breaking changes. Migration notes are in CHANGELOG.md.",
    ],
  },
  {
    slug: "drawing-on-one-grid",
    type: "article",
    date: "2026-08-02",
    read: 6,
    product: "orbit-icon-set",
    author: "Meridian UI",
    title_th: "วาดไอคอน 1,200 ชิ้นบนกริดเดียว",
    title_en: "Drawing 1,200 icons on one grid",
    dek_th: "ทำไมความสม่ำเสมอถึงสำคัญกว่าความสวยของไอคอนแต่ละชิ้น",
    dek_en: "Why consistency matters more than any single icon looking good.",
    body_th: [
      "ไอคอนที่สวยหนึ่งชิ้นไม่ได้ช่วยอินเทอร์เฟซเท่าไร แต่ไอคอนร้อยชิ้นที่มีน้ำหนักและขนาดเท่ากันทำให้หน้าจออ่านง่ายขึ้นทันที",
      "ทุกไอคอนใน Orbit ใช้ keyline เดียวกัน มุมโค้งเดียวกัน และเว้นขอบ 2px เท่ากันทุกด้าน",
    ],
    body_en: [
      "One beautiful icon does little for an interface. A hundred icons with matching weight and size make a screen easier to read at once.",
      "Every Orbit icon shares the same keylines, the same corner radius, and the same 2px padding on every side.",
    ],
  },
  {
    slug: "blameless-postmortems",
    type: "guide",
    date: "2026-06-15",
    read: 8,
    product: "incident-report-templates",
    author: "Field Manual Press",
    title_th: "Postmortem แบบไม่กล่าวโทษ ทำอย่างไรให้ได้ผลจริง",
    title_en: "Blameless postmortems that actually change things",
    dek_th: "รายงานเหตุขัดข้องที่ดีจบด้วยงานที่มีเจ้าของ ไม่ใช่บทเรียนลอย ๆ",
    dek_en: "A good incident report ends in owned work, not loose lessons.",
    body_th: [
      "Postmortem ส่วนใหญ่ล้มเหลวไม่ใช่เพราะเขียนไม่ดี แต่เพราะไม่มีใครรับผิดชอบสิ่งที่ต้องแก้ต่อ",
      "เทมเพลตของเราบังคับให้ทุกข้อเสนอแนะมีเจ้าของ วันที่ และวิธีตรวจว่าแก้แล้วจริง",
    ],
    body_en: [
      "Most postmortems fail not because they're badly written, but because nobody owns the follow-up.",
      "Our template requires every recommendation to have an owner, a date, and a way to verify it's done.",
    ],
  },
  {
    slug: "why-we-built-vector",
    type: "article",
    date: "2026-05-01",
    read: 4,
    product: null,
    author: "VECTOR",
    title_th: "ทำไมเราถึงสร้าง VECTOR",
    title_en: "Why we built VECTOR",
    dek_th: "ตลาดสินค้าดิจิทัลที่ให้ข้อมูลก่อนการตลาด",
    dek_en: "A digital marketplace that puts specifications before marketing.",
    body_th: [
      "สินค้าดิจิทัลส่วนใหญ่ขายด้วยภาพหน้าปก แต่คนที่ซื้อไปใช้งานจริงอยากรู้ว่าได้ไฟล์อะไร ใช้กับโปรแกรมไหน และอัปเดตล่าสุดเมื่อไร",
      "VECTOR จึงแสดงสินค้าทุกชิ้นเหมือนเอกสารสเปก รูปแบบไฟล์ เวอร์ชัน ไลเซนส์ และการจัดส่งอยู่ในที่เดียวกันเสมอ",
    ],
    body_en: [
      "Most digital products are sold on cover art. The people who buy them to do real work want to know what files they get, what software they need, and when it was last updated.",
      "So every product on VECTOR reads like a specification sheet: format, version, license and delivery, always in the same place.",
    ],
  },
];
