"use client";
import { useState } from "react";
import { Calculator, ArrowUpRight, Info } from "lucide-react";
import { tools, calculate, convert, unitGroups } from "@/lib/calculators";
import { useHub } from "./provider";
export function Tools() {
  const { t, lang } = useHub(),
    [selected, setSelected] = useState("stress"),
    [group, setGroup] = useState<keyof typeof unitGroups>("length"),
    [from, setFrom] = useState("m"),
    [to, setTo] = useState("mm"),
    [beamCase, setBeamCase] = useState("simply-supported"),
    [values, setValues] = useState<Record<string, number>>({}),
    [result, setResult] = useState<{
      result: number;
      secondary?: number;
    } | null>(null),
    [invalid, setInvalid] = useState(false);
  const tool = tools.find((t) => t.id === selected)!;
  return (
    <section className="wrap section">
      <div className="page-head">
        <span className="eyebrow">ENGINEERING TOOLBOX / 05</span>
        <h1>{t("من المعطيات إلى الفهم.", "From numbers to understanding.")}</h1>
        <p>
          {t(
            "سبع أدوات حسابية مع المعادلات والوحدات، للتعلّم والتحقق الأولي.",
            "Seven calculators with formulas and units for learning and initial checks.",
          )}
        </p>
      </div>
      <div className="tool-layout">
        <nav
          className="tool-nav glass"
          aria-label={t("الأدوات الهندسية", "Engineering calculators")}
        >
          {tools.map((tool) => (
            <button
              className={tool.id === selected ? "active" : ""}
              key={tool.id}
              onClick={() => {
                setSelected(tool.id);
                setValues({});
                setResult(null);
                setInvalid(false);
              }}
            >
              <Calculator size={17} />
              {lang === "ar" ? tool.ar : tool.en}
              <ArrowUpRight size={16} />
            </button>
          ))}
        </nav>
        <div className="glass calculator">
          <span className="eyebrow">
            {t("حاسبة هندسية", "ENGINEERING CALCULATOR")}
          </span>
          <h2>{lang === "ar" ? tool.ar : tool.en}</h2>
          <div className="formula" dir="ltr">
            {tool.formula}
          </div>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const inputs = Object.fromEntries(
                  tool.inputs.map(([id, , , , value]) => [
                    id,
                    values[id] ?? value,
                  ]),
                );
                setResult(
                  tool.id === "units"
                    ? { result: convert(inputs.value, group, from, to) }
                    : calculate(tool.id, inputs, beamCase),
                );
                setInvalid(false);
              } catch {
                setInvalid(true);
                setResult(null);
              }
            }}
          >
            {tool.id === "units" && (
              <div className="two-cols">
                <label className="field">
                  <span>{t("نوع التحويل", "Quantity")}</span>
                  <select
                    value={group}
                    onChange={(e) => {
                      const g = e.target.value as keyof typeof unitGroups;
                      setGroup(g);
                      setFrom(Object.keys(unitGroups[g])[0]);
                      setTo(Object.keys(unitGroups[g])[1]);
                      setResult(null);
                    }}
                  >
                    {Object.keys(unitGroups).map((g) => (
                      <option key={g} value={g}>
                        {
                          (
                            {
                              length: t("طول", "Length"),
                              force: t("قوة", "Force"),
                              pressure: t("ضغط", "Pressure"),
                              power: t("قدرة", "Power"),
                              temperature: t("حرارة", "Temperature"),
                            } as Record<string, string>
                          )[g]
                        }
                      </option>
                    ))}
                  </select>
                </label>
                <div />
                <label className="field">
                  <span>{t("من", "From")}</span>
                  <select
                    value={from}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      setResult(null);
                    }}
                  >
                    {Object.keys(unitGroups[group]).map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{t("إلى", "To")}</span>
                  <select
                    value={to}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setResult(null);
                    }}
                  >
                    {Object.keys(unitGroups[group]).map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            {tool.id === "beam" && (
              <>
                <label className="field">
                  <span>
                    {t("حالة الإسناد والحمل", "Support and load case")}
                  </span>
                  <select
                    value={beamCase}
                    onChange={(e) => {
                      setBeamCase(e.target.value);
                      setResult(null);
                    }}
                  >
                    <option value="simply-supported">
                      {t(
                        "بسيطة الارتكاز — حمل مركزي",
                        "Simply supported — center point load",
                      )}
                    </option>
                    <option value="cantilever">
                      {t("كابولية — حمل طرفي", "Cantilever — end point load")}
                    </option>
                  </select>
                </label>
                <svg
                  viewBox="0 0 400 100"
                  role="img"
                  aria-label={t(
                    "رسم يوضح الإسناد والحمل على العارضة",
                    "Diagram showing beam supports and point load",
                  )}
                >
                  <path d="M40 55H360" stroke="var(--text)" strokeWidth="5" />
                  <path
                    d={
                      beamCase === "cantilever"
                        ? "M40 20V90"
                        : "M40 55L25 80H55Z M360 55L345 80H375Z"
                    }
                    stroke="var(--muted)"
                    fill="none"
                    strokeWidth="3"
                  />
                  <path
                    d={
                      beamCase === "cantilever"
                        ? "M360 5V43L354 35M360 43L366 35"
                        : "M200 5V43L194 35M200 43L206 35"
                    }
                    stroke="var(--blue)"
                    strokeWidth="3"
                    fill="none"
                  />
                  <text x="185" y="95" fill="var(--muted)" fontSize="12">
                    L
                  </text>
                </svg>
              </>
            )}
            <div className="two-cols">
              {tool.inputs.map(([id, ar, en, unit, value]) => (
                <label className="field" key={id}>
                  <span>
                    {t(ar, en)} <small>{unit}</small>
                  </span>
                  <input
                    type="number"
                    required
                    step="any"
                    value={values[id] ?? value}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        [id]:
                          e.target.value === "" ? NaN : Number(e.target.value),
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <button className="button primary">
              {t("احسب النتيجة", "Calculate")}
              <ArrowUpRight size={18} />
            </button>
          </form>
          {invalid && (
            <p role="alert" className="form-error">
              {t(
                "تحقق من الوحدات والمدخلات. المقامات والكميات الفيزيائية المطلوبة موجبة، والحرارة لا تقل عن الصفر المطلق.",
                "Check units and inputs. Required denominators and physical quantities must be positive. Temperature cannot be below absolute zero.",
              )}
            </p>
          )}
          {result && (
            <div className="result" role="status">
              <small>{t("النتيجة", "RESULT")}</small>
              <strong dir="ltr">
                {result.result.toLocaleString("en-US", {
                  maximumSignificantDigits: 8,
                })}{" "}
                <span>{tool.id === "units" ? to : tool.unit}</span>
              </strong>
              {result.secondary !== undefined && (
                <p dir="ltr">n₂ = {result.secondary.toFixed(4)} rpm</p>
              )}
            </div>
          )}
          {tool.id === "beam" && (
            <p className="small muted">
              {t(
                "يفترض مقطعًا ثابتًا، ومادة خطية مرنة، وانحرافًا صغيرًا، وحملًا ساكنًا. لا يشمل تشوه القص.",
                "Assumes a constant section, linear elastic material, small deflection, and static point loading. Shear deformation is excluded.",
              )}
            </p>
          )}
          <div className="notice small">
            <Info size={18} />
            {t(
              "أداة تعليمية تفترض نماذج مثالية ووحدات المدخلات المحددة. لا تُستخدم وحدها لاعتماد تصميم أو لاتخاذ قرار سلامة.",
              "Educational tools using idealized models and the specified units. Do not use alone to approve a design or make safety decisions.",
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
