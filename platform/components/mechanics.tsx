"use client";
import { useState, useRef } from "react";
import { Pause, Play, RotateCcw, MoveUpRight } from "lucide-react";
import { useHub } from "./provider";
function gearPath(teeth: number, r: number) {
  const points = [];
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i * Math.PI * 2) / (teeth * 4),
      d = i % 4 === 0 || i % 4 === 3 ? r * 0.85 : r;
    points.push(`${i ? "L" : "M"}${Math.cos(a) * d},${Math.sin(a) * d}`);
  }
  return points.join(" ") + "Z";
}
export function Mechanics() {
  const { t } = useHub(),
    [rotation, setRotation] = useState(0),
    [tilt, setTilt] = useState({ x: 58, y: -18 }),
    [paused, setPaused] = useState(false),
    [selected, setSelected] = useState(0),
    start = useRef<{ x: number; y: number; r: number } | null>(null);
  return (
    <div
      className="mechanics glass"
      aria-label={t(
        "مختبر ميكانيكي تفاعلي",
        "Interactive mechanical laboratory",
      )}
    >
      <div className="lab-caption">
        <span className="dot" />
        KINETIC LAB <span>01 — 03</span>
      </div>
      <div
        className="mechanical-stage"
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY, r: rotation };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (start.current) {
            setRotation(start.current.r + (e.clientX - start.current.x) * 0.6);
            setTilt({
              x: Math.max(
                30,
                Math.min(75, 58 + (e.clientY - start.current.y) * 0.15),
              ),
              y: -18,
            });
          }
        }}
        onPointerUp={() => {
          start.current = null;
        }}
        onPointerCancel={() => {
          start.current = null;
        }}
      >
        <div className="blueprint-grid" />
        <svg
          viewBox="0 0 600 460"
          className="gear-scene"
          style={{
            transform: `perspective(900px) rotateX(${tilt.x}deg) rotateZ(${tilt.y}deg)`,
            animationPlayState: paused ? "paused" : "running",
          }}
          role="img"
          aria-label={t(
            "تروس مترابطة قابلة للتدوير",
            "Interconnected draggable gears",
          )}
        >
          <defs>
            <linearGradient id="steel" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#eef6fc" />
              <stop offset=".23" stopColor="#adc7da" />
              <stop offset=".48" stopColor="#f8fcff" />
              <stop offset=".7" stopColor="#6789a5" />
              <stop offset="1" stopColor="#c9dfef" />
            </linearGradient>
            <linearGradient id="blue" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#53aff3" />
              <stop offset=".5" stopColor="#2879ba" />
              <stop offset="1" stopColor="#102a43" />
            </linearGradient>
            <filter id="shadow">
              <feDropShadow
                dx="10"
                dy="22"
                stdDeviation="9"
                floodColor="#081d30"
                floodOpacity=".27"
              />
            </filter>
          </defs>
          {(selected === 0
            ? [
                [245, 230, 140, 20, 1],
                [433, 213, 76, 12, -1.67],
                [352, 369, 67, 10, -2],
              ]
            : selected === 1
              ? [
                  [215, 235, 123, 18, 1],
                  [414, 235, 123, 18, -1],
                ]
              : [
                  [302, 215, 137, 24, 1],
                  [311, 390, 59, 10, -2.4],
                ]
          ).map(([x, y, r, teeth, ratio], i) => (
            <g
              key={`${selected}-${i}`}
              transform={`translate(${x} ${y})`}
              filter="url(#shadow)"
            >
              <g
                className={`spinning gear-${i}`}
                style={{
                  animationPlayState: paused ? "paused" : "running",
                  animationDirection: i % 2 ? "reverse" : "normal",
                }}
              >
                <g transform={`rotate(${rotation * ratio})`}>
                  {[18, 12, 6, 0].map((depth) => (
                    <path
                      key={depth}
                      d={gearPath(teeth, r)}
                      transform={`translate(0 ${depth})`}
                      fill={
                        depth
                          ? "#55758e"
                          : i === 1
                            ? "url(#blue)"
                            : "url(#steel)"
                      }
                      stroke="#6688a2"
                      strokeWidth="1.2"
                    />
                  ))}
                  <circle
                    r={r * 0.32}
                    fill="#163b58"
                    stroke="#c5dcea"
                    strokeWidth="9"
                  />
                  <circle
                    r={r * 0.18}
                    fill="#ecf6fd"
                    stroke="#6186a2"
                    strokeWidth="4"
                  />
                  {[0, 72, 144, 216, 288].map((a) => (
                    <circle
                      key={a}
                      cx={Math.cos((a * Math.PI) / 180) * r * 0.61}
                      cy={Math.sin((a * Math.PI) / 180) * r * 0.61}
                      r={r * 0.09}
                      fill="#41627b"
                      stroke="#dcecf7"
                      strokeWidth="2"
                    />
                  ))}
                </g>
              </g>
            </g>
          ))}
        </svg>
        <span className="axis axis-x">X</span>
        <span className="axis axis-y">Y</span>
        <div className="drag-hint">
          <MoveUpRight size={14} />
          {t("اسحب. دوّر. اكتشف.", "Drag. Rotate. Discover.")}
        </div>
      </div>
      <div className="lab-controls">
        <div className="tabs">
          {[
            t("التروس", "Gears"),
            t("نقل الحركة", "Transmission"),
            t("النسبة", "Ratio"),
          ].map((label, i) => (
            <button
              key={i}
              className={selected === i ? "active" : ""}
              onClick={() => setSelected(i)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className="icon-button"
          aria-label={t(
            paused ? "تشغيل الحركة" : "إيقاف الحركة",
            paused ? "Play" : "Pause",
          )}
          onClick={() => setPaused((v) => !v)}
        >
          {paused ? <Play size={17} /> : <Pause size={17} />}
        </button>
        <button
          className="icon-button"
          aria-label={t("إعادة الضبط", "Reset")}
          onClick={() => {
            setRotation(0);
            setTilt({ x: 58, y: -18 });
            setPaused(false);
          }}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <label className="sr-only" htmlFor="rotation">
        {t("زاوية الدوران", "Rotation angle")}
      </label>
      <input
        id="rotation"
        className="rotation-range"
        type="range"
        min="-360"
        max="360"
        value={rotation}
        onChange={(e) => setRotation(Number(e.target.value))}
      />
    </div>
  );
}
