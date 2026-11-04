export const tools = [
  {
    id: "units",
    ar: "تحويل الوحدات",
    en: "Unit converter",
    formula: "SI base → selected unit",
    inputs: [["value", "القيمة", "Value", "", 1]],
    unit: "",
  },
  {
    id: "stress",
    ar: "الإجهاد المحوري",
    en: "Axial stress",
    formula: "σ = F / A",
    inputs: [
      ["force", "القوة", "Force", "N", 1000],
      ["area", "المساحة", "Area", "mm²", 100],
    ],
    unit: "MPa",
  },
  {
    id: "strain",
    ar: "الانفعال",
    en: "Strain",
    formula: "ε = ΔL / L₀",
    inputs: [
      ["extension", "الاستطالة", "Extension", "mm", 1],
      ["length", "الطول الأصلي", "Original length", "mm", 1000],
    ],
    unit: "mm/mm",
  },
  {
    id: "torque",
    ar: "عزم الدوران",
    en: "Torque",
    formula: "T = F × r",
    inputs: [
      ["force", "القوة العمودية", "Perpendicular force", "N", 100],
      ["radius", "ذراع العزم", "Moment arm", "m", 0.5],
    ],
    unit: "N·m",
  },
  {
    id: "power",
    ar: "القدرة الميكانيكية",
    en: "Mechanical power",
    formula: "P = T × 2πn / 60",
    inputs: [
      ["torque", "العزم", "Torque", "N·m", 10],
      ["rpm", "السرعة", "Speed", "rpm", 1500],
    ],
    unit: "W",
  },
  {
    id: "expansion",
    ar: "التمدد الحراري",
    en: "Thermal expansion",
    formula: "ΔL = α L₀ ΔT",
    inputs: [
      ["coefficient", "معامل التمدد", "Expansion coefficient", "1/K", 0.000012],
      ["length", "الطول الأصلي", "Original length", "m", 1],
      ["delta", "فرق الحرارة", "Temperature change", "K", 50],
    ],
    unit: "m",
  },
  {
    id: "beam",
    ar: "انحراف العارضة",
    en: "Beam deflection",
    formula: "δ = FL³/(48EI) or FL³/(3EI)",
    inputs: [
      ["force", "الحمل", "Load", "N", 1000],
      ["length", "طول العارضة", "Beam length", "m", 2],
      ["modulus", "معامل يونغ", "Young’s modulus", "GPa", 200],
      [
        "inertia",
        "عزم المساحة الثاني",
        "Second moment of area",
        "mm⁴",
        1000000,
      ],
    ],
    unit: "mm",
  },
] as const;
export const unitGroups = {
  length: { m: 1, mm: 0.001, cm: 0.01, km: 1000, in: 0.0254, ft: 0.3048 },
  force: { N: 1, kN: 1000, lbf: 4.4482216152605 },
  pressure: { Pa: 1, kPa: 1000, MPa: 1e6, bar: 1e5, psi: 6894.757293168 },
  power: { W: 1, kW: 1000, hp: 745.6998715822702 },
  temperature: { C: 1, F: 1, K: 1 },
};
export function convert(
  value: number,
  group: keyof typeof unitGroups,
  from: string,
  to: string,
) {
  if (!Number.isFinite(value)) throw new Error("INVALID_NUMBER");
  const units = unitGroups[group] as Record<string, number>;
  if (!units[from] || !units[to]) throw new Error("INVALID_UNIT");
  if (group === "temperature") {
    const kelvin =
      from === "K"
        ? value
        : from === "C"
          ? value + 273.15
          : ((value - 32) * 5) / 9 + 273.15;
    if (kelvin < 0) throw new Error("BELOW_ABSOLUTE_ZERO");
    return to === "K"
      ? kelvin
      : to === "C"
        ? kelvin - 273.15
        : ((kelvin - 273.15) * 9) / 5 + 32;
  }
  return (value * units[from]) / units[to];
}
export function calculate(
  id: string,
  v: Record<string, number>,
  beamCase = "simply-supported",
) {
  if (Object.values(v).some((n) => !Number.isFinite(n)))
    throw new Error("INVALID_NUMBER");
  const positive = (...keys: string[]) => {
    if (keys.some((k) => !(v[k] > 0))) throw new Error("POSITIVE_REQUIRED");
  };
  let result: number;
  switch (id) {
    case "stress":
      positive("area");
      result = v.force / v.area;
      break;
    case "strain":
      positive("length");
      result = v.extension / v.length;
      break;
    case "torque":
      positive("radius");
      result = v.force * v.radius;
      break;
    case "power":
      result = (v.torque * 2 * Math.PI * v.rpm) / 60;
      break;
    case "expansion":
      positive("length");
      result = v.coefficient * v.length * v.delta;
      break;
    case "beam":
      positive("length", "modulus", "inertia");
      if (!["simply-supported", "cantilever"].includes(beamCase))
        throw new Error("INVALID_CASE");
      result =
        ((v.force * v.length ** 3) /
          ((beamCase === "cantilever" ? 3 : 48) *
            v.modulus *
            1e9 *
            v.inertia *
            1e-12)) *
        1000;
      break;
    default:
      throw new Error("UNKNOWN_TOOL");
  }
  if (!Number.isFinite(result)) throw new Error("INVALID_NUMBER");
  return { result };
}
