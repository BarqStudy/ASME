import "dotenv/config";
import { db } from "../lib/db";
const bi = (ar: string, en: string) => ({ ar, en });
async function seed() {
  await db.platformSetting.upsert({
    where: { key: "membership" },
    create: {
      key: "membership",
      value: {
        open: false,
        notice: bi(
          "ستُعلن فترة التسجيل عبر قنوات النادي.",
          "Application dates will be announced through the club.",
        ),
      },
    },
    update: {},
  });
  await db.platformSetting.upsert({
    where: { key: "club" },
    create: {
      key: "club",
      value: {
        about: bi(
          "نادي طلابي في جامعة نجران، يجمع طلاب كلية الهندسة المهتمين بالهندسة الميكانيكية، من خلال الأنشطة والورش والمشاريع والمسابقات.",
          "A Najran University student club bringing together College of Engineering students interested in mechanical engineering through activities, workshops, projects, and competitions.",
        ),
        vision: bi(
          "مجتمع طلابي رائد يسهم في تشكيل مستقبل الهندسة الميكانيكية بالمعرفة والابتكار.",
          "A leading student community shaping the future of mechanical engineering through knowledge and innovation.",
        ),
        mission: bi(
          "تمكين طلاب الهندسة بالتعلم التطبيقي والتعاون والأنشطة الميكانيكية، وبناء جسور بين الجامعة والممارسة المهنية.",
          "Empower engineering students through practical learning, collaboration, and mechanical activities connecting university study with professional practice.",
        ),
        email: "club@example.invalid",
        linkedin: "",
      },
    },
    update: {},
  });
  await db.platformSetting.upsert({
    where: { key: "leadership" },
    create: { key: "leadership", value: [] },
    update: {},
  });
  const courses = [
    ["mechanics", "الميكانيكا الهندسية", "Engineering Mechanics"],
    ["thermodynamics", "الديناميكا الحرارية", "Thermodynamics"],
    ["fluid-mechanics", "ميكانيكا الموائع", "Fluid Mechanics"],
    ["machine-design", "تصميم الآلات", "Machine Design"],
    ["manufacturing", "التصنيع", "Manufacturing"],
    ["cad", "التصميم بالحاسب", "CAD"],
  ];
  for (const [slug, ar, en] of courses)
    await db.course.upsert({
      where: { slug },
      create: {
        slug,
        title: bi(ar, en),
        description: bi(
          "مراجع ومصادر تعليمية مرخصة للمقرر.",
          "Licensed learning materials and references for this course.",
        ),
      },
      update: {},
    });
  if (!(await db.committee.count()))
    await db.committee.createMany({
      data: [
        {
          title: bi("التطوير والأنشطة", "Development & activities"),
          description: bi(
            "تنظيم التجارب والورش والزيارات الهندسية.",
            "Organize engineering experiences, workshops, and visits.",
          ),
        },
        {
          title: bi("المشاريع والابتكار", "Projects & innovation"),
          description: bi(
            "دعم الأفكار الطلابية والعمل الجماعي.",
            "Support student ideas and collaborative projects.",
          ),
        },
        {
          title: bi("الإعلام والمحتوى", "Media & content"),
          description: bi(
            "مشاركة المعرفة وتوثيق أنشطة النادي.",
            "Share knowledge and document club activities.",
          ),
        },
      ],
    });
  if (
    process.env.SEED_SAMPLES === "true" &&
    !(await db.event.findFirst({ where: { isSample: true } }))
  ) {
    const now = Date.now(),
      samples = [
        [
          "cad-introduction",
          "من الفكرة إلى النموذج",
          "From idea to model",
          "workshop",
          10,
        ],
        [
          "mechanical-design-lab",
          "مختبر التصميم الميكانيكي",
          "Mechanical design laboratory",
          "activity",
          17,
        ],
        [
          "engineering-conversation",
          "حوار في مستقبل الصناعة",
          "A conversation on industry’s future",
          "talk",
          24,
        ],
      ] as const;
    for (const [slug, ar, en, category, days] of samples) {
      const startsAt = new Date(now + days * 86400000);
      await db.event.create({
        data: {
          slug,
          title: bi(ar, en),
          description: bi(
            "نموذج توضيحي لتجربة النادي. المحتوى والموعد قابلان للتحرير ولا يمثلان إعلانًا رسميًا.",
            "A sample club experience. Content and dates are editable and do not represent an official announcement.",
          ),
          body: bi(
            "هذه بطاقة توضيحية تساعد فريق النادي على تجربة النشر والتسجيل والحضور. يجب استبدالها بفعالية معتمدة قبل الإطلاق الرسمي.",
            "This sample helps the club team try publishing, registration, and attendance. Replace it with an approved event before official launch.",
          ),
          location: bi("جامعة نجران — نموذج", "Najran University — sample"),
          category,
          startsAt,
          endsAt: new Date(startsAt.getTime() + 7200000),
          deadline: new Date(startsAt.getTime() - 3600000),
          capacity: 30,
          waitlistEnabled: true,
          published: true,
          featured: true,
          isSample: true,
          searchText: `${ar} ${en}`.toLowerCase(),
        },
      });
    }
  }
  console.log(
    "Seed complete. Existing content preserved. Sample events:",
    process.env.SEED_SAMPLES === "true" ? "enabled" : "disabled",
  );
}
seed().finally(() => db.$disconnect());
