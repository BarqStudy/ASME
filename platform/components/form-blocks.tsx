"use client";
import Image from "next/image";
import { useId, useState } from "react";
import { Play } from "lucide-react";
import { useHub } from "./provider";
import {
  isContent,
  mediaUrl,
  videoSource,
  type MembershipFormDefinition,
} from "@/lib/form-schema";

export function FormMedia({
  url,
  caption,
  video = false,
}: {
  url: string;
  caption: string;
  video?: boolean;
}) {
  const { t } = useHub();
  const [loaded, setLoaded] = useState(false);
  if (!url || !mediaUrl.safeParse(url).success) return null;
  if (!video)
    return (
      <Image
        className="form-media"
        src={url}
        alt={caption}
        width={960}
        height={540}
        unoptimized
      />
    );
  const source = videoSource(url);
  if (!source)
    return (
      <p className="muted">
        {t(
          "أضف رابط YouTube أو فيديو MP4 / WebM",
          "Add a YouTube or MP4 / WebM video URL",
        )}
      </p>
    );
  if (source.type === "file")
    return (
      <video
        className="form-media"
        src={source.url}
        controls
        preload="none"
        aria-label={caption}
      />
    );
  return loaded ? (
    <iframe
      className="form-video"
      title={caption}
      src={source.url}
      allow="fullscreen; picture-in-picture"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  ) : (
    <button
      type="button"
      className="video-placeholder"
      onClick={() => setLoaded(true)}
    >
      <Play size={32} />
      <strong>{caption}</strong>
      <span>{t("تشغيل فيديو YouTube", "Play YouTube video")}</span>
    </button>
  );
}
export function FormQuestions({
  definition,
  disabled = false,
}: {
  definition: MembershipFormDefinition;
  disabled?: boolean;
}) {
  const { t, bi } = useHub();
  const prefix = useId();
  return (
    <div className="question-stack">
      {definition.fields.map((field, index) => {
        const id = `${prefix}-${field.id}`,
          name = `answer-${field.id}`,
          title = bi(field.label);
        if (isContent(field.type))
          return (
            <section
              className={`question-block content-block content-${field.type}`}
              key={field.id}
            >
              <h3>{title}</h3>
              {bi(field.description) && <p>{bi(field.description)}</p>}
              {field.type !== "section" && (
                <FormMedia
                  key={field.mediaUrl}
                  url={field.mediaUrl}
                  caption={title}
                  video={field.type === "video"}
                />
              )}
            </section>
          );
        return (
          <fieldset
            key={field.id}
            className="question-block"
            disabled={disabled}
          >
            <legend>
              <span className="question-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              {title}
              {field.required && <span className="required-mark"> *</span>}
            </legend>
            {bi(field.description) && (
              <p className="small muted" id={`${id}-hint`}>
                {bi(field.description)}
              </p>
            )}
            {field.mediaUrl && (
              <FormMedia url={field.mediaUrl} caption={title} />
            )}
            {field.type === "radio" || field.type === "multiselect" ? (
              <div
                className={
                  field.options.some((o) => o.imageUrl)
                    ? "choice-list image-choices"
                    : "choice-list"
                }
              >
                {field.options.map((option) => (
                  <label className="choice-option" key={option.id}>
                    {option.imageUrl && (
                      <FormMedia
                        url={option.imageUrl}
                        caption={bi(option.label)}
                      />
                    )}
                    <span>
                      <input
                        type={field.type === "radio" ? "radio" : "checkbox"}
                        name={name}
                        value={option.id}
                        required={field.type === "radio" && field.required}
                      />
                      {bi(option.label)}
                    </span>
                  </label>
                ))}
              </div>
            ) : field.type === "select" ? (
              <label className="field">
                <span className="sr-only">{title}</span>
                <select name={name} defaultValue="" required={field.required}>
                  <option value="">
                    {t("اختر إجابة", "Choose an answer")}
                  </option>
                  {field.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {bi(o.label)}
                    </option>
                  ))}
                </select>
              </label>
            ) : field.type === "checkbox" ? (
              <label className="check">
                <input type="checkbox" name={name} required={field.required} />
                {t("أوافق", "I agree")}
              </label>
            ) : (
              <label className="field">
                <span className="sr-only">{title}</span>
                {field.type === "textarea" ? (
                  <textarea
                    name={name}
                    required={field.required}
                    maxLength={5000}
                    rows={4}
                    aria-describedby={
                      bi(field.description) ? `${id}-hint` : undefined
                    }
                  />
                ) : (
                  <input
                    name={name}
                    type={field.type}
                    step={field.type === "number" ? "any" : undefined}
                    maxLength={field.type === "number" ? undefined : 500}
                    required={field.required}
                    aria-describedby={
                      bi(field.description) ? `${id}-hint` : undefined
                    }
                  />
                )}
              </label>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
