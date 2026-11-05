"use client";
import { useEffect, useRef, useState } from "react";
import { useHub } from "./provider";

export function Mechanics() {
  const { t } = useHub();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import("./mechanics-renderer")
      .then(({ mountGear }) => {
        if (disposed || !canvas.current) return;
        cleanup = mountGear(canvas.current);
        setReady(true);
      })
      .catch(() => {
        /* The lightweight fallback remains visible without WebGL. */
      });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);
  return (
    <div className="mechanics glass auto-mechanics">
      <div className="lab-caption">
        <span className="dot" />
        ENGINEERED TO MOVE<span>ASME / NU</span>
      </div>
      <div
        className="mechanical-stage automatic-stage"
        role="img"
        aria-label={t(
          "ترس ثلاثي الأبعاد يدور تلقائيًا",
          "An automatically rotating three-dimensional gear",
        )}
      >
        <div className="gear-halo" />
        {!ready && (
          <div className="gear-fallback" aria-hidden="true">
            ⚙
          </div>
        )}
        <canvas
          ref={canvas}
          className={ready ? "gear-canvas ready" : "gear-canvas"}
          aria-hidden="true"
        />
      </div>
      <div className="gear-signature">
        <span>PRECISION IN EVERY TURN</span>
        <span>01 / ∞</span>
      </div>
    </div>
  );
}
