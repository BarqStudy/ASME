"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, CheckCircle2, LockKeyhole } from "lucide-react";
import { useHub, api } from "./provider";
import { FormQuestions } from "./form-blocks";
import { getMembershipForm, readFormAnswers } from "@/lib/form-schema";
import { isPages } from "@/lib/site-mode";

export function MembershipForm() {
  const { content, me, t, bi, error } = useHub();
  const [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [invalid, setInvalid] = useState("");
  const setting = content.settings.membership as {
    open?: boolean;
    notice?: unknown;
  };
  const definition = getMembershipForm(content.settings.membershipForm);
  const closed = isPages || !setting?.open;
  const disabled = closed || !me?.verified;
  if (sent)
    return (
      <div className="notice membership-success" role="status">
        <CheckCircle2 size={44} />
        <h2>{bi(definition.confirmation)}</h2>
        <Link className="button primary" href="/portal">
          {t("متابعة طلبي", "View my application")}
        </Link>
      </div>
    );
  return (
    <div className="membership-form-shell">
      <div className="form-intro glass">
        <span className="eyebrow">ASME NU / MEMBERSHIP</span>
        <h2>{bi(definition.title)}</h2>
        <p>{bi(definition.description)}</p>
        <span className={`form-status ${closed ? "closed" : "open"}`}>
          {t(
            closed
              ? "التسجيل مغلق حاليًا · معاينة النموذج"
              : "باب الانضمام مفتوح",
            closed
              ? "Applications closed · Form preview"
              : "Applications are open",
          )}
        </span>
      </div>
      {(closed || !me?.verified) && (
        <div className="notice membership-notice" role="status">
          <LockKeyhole size={20} />
          <p>
            {closed
              ? t(
                  "يمكنك الاطلاع على النموذج. تعبئته وإرساله متاحان عند فتح التسجيل وتفعيل خدمات النادي.",
                  "You can preview the form. Completing and submitting it will be available when registration and club services open.",
                )
              : t(
                  "اطّلع على النموذج ثم سجّل الدخول بحساب مفعّل لتعبئته وإرسال طلبك.",
                  "Preview the form, then sign in with a verified account to complete and submit your application.",
                )}
          </p>
          {!closed && (
            <Link
              className="button secondary compact"
              href={me ? "/auth/resend" : "/auth/login"}
            >
              {t(
                me ? "تأكيد البريد" : "تسجيل الدخول",
                me ? "Verify email" : "Sign in",
              )}
            </Link>
          )}
        </div>
      )}
      {bi(setting?.notice) && <p className="muted">{bi(setting.notice)}</p>}
      <form
        className="membership-dynamic"
        onSubmit={async (e) => {
          e.preventDefault();
          if (disabled || busy) return;
          setInvalid("");
          let answers;
          try {
            answers = readFormAnswers(definition, e.currentTarget);
          } catch {
            setInvalid(
              t(
                "تحقق من الإجابات المطلوبة، واختر إجابة واحدة على الأقل للأسئلة الإلزامية متعددة الخيارات.",
                "Check required answers and select at least one option for required checkbox questions.",
              ),
            );
            return;
          }
          const consent = new FormData(e.currentTarget).get("consent") === "on";
          setBusy(true);
          try {
            await api("membership", {
              formVersion: definition.version,
              answers,
              consent,
            });
            setSent(true);
          } catch (err) {
            error(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <FormQuestions
          key={definition.version}
          definition={definition}
          disabled={disabled || busy}
        />
        <fieldset
          className="question-block consent-block"
          disabled={disabled || busy}
        >
          <label className="check">
            <input name="consent" type="checkbox" required />
            {t(
              "أوافق على استخدام بياناتي لمراجعة عضوية النادي. عضوية النادي مستقلة عن عضوية ASME الدولية.",
              "I consent to using my data to review club membership, which is separate from international ASME membership.",
            )}
          </label>
        </fieldset>
        {invalid && (
          <p className="form-error" role="alert">
            {invalid}
          </p>
        )}
        <button className="button primary" disabled={disabled || busy}>
          {t(
            busy ? "جارٍ الإرسال…" : "أرسل طلبك وابدأ الأثر",
            busy ? "Submitting…" : "Apply and make your mark",
          )}
          <ArrowUpRight size={18} />
        </button>
      </form>
    </div>
  );
}
