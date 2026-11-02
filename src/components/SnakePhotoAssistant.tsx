import { useEffect, useRef, useState } from "react";
import { ImagePlus, ShieldQuestion, Upload } from "lucide-react";
const samples = [
  {
    name: "Spectacled cobra",
    pattern: "hood",
    note: "Illustrative species profile. A real model would need validated local training data.",
  },
  {
    name: "Russell’s viper",
    pattern: "spots",
    note: "Illustrative species profile. Appearance alone does not establish treatment needs.",
  },
  {
    name: "Common krait",
    pattern: "bands",
    note: "Illustrative species profile. A confidence score would not prove identification.",
  },
  {
    name: "Ambiguous / blurry",
    pattern: "blur",
    note: "Unable to identify is an essential outcome. No prediction is being made here.",
  },
];
export function SnakePhotoAssistant() {
  const [sample, setSample] = useState(0),
    [preview, setPreview] = useState<string | null>(null),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  return (
    <>
      <p className="intro-text">
        Optional species information. Finding care never depends on a
        photograph.
      </p>
      <div className="notice">
        <ShieldQuestion size={19} />
        <div>
          <strong>No trained model is configured.</strong>
          <p>
            These four illustrated samples are educational UI examples, not
            photos or AI predictions. Uploaded images are previewed locally and
            are not sent or stored.
          </p>
        </div>
      </div>
      <div className="photo-grid">
        {samples.map((s, i) => (
          <button
            key={s.name}
            className={sample === i ? "active" : ""}
            onClick={() => setSample(i)}
          >
            <svg viewBox="0 0 140 90" aria-hidden="true">
              <path
                d={
                  i === 0
                    ? "M70 76Q105 67 87 45Q65 18 74 14Q91 15 92 29"
                    : i === 1
                      ? "M20 70Q115 85 95 50Q72 16 47 46Q30 70 95 67"
                      : i === 2
                        ? "M25 70Q100 75 98 44Q95 17 65 30Q33 50 66 55"
                        : "M22 65Q90 80 92 48Q91 22 57 39"
                }
                fill="none"
                stroke={i === 3 ? "#bbb6a6" : "#8b8664"}
                strokeWidth={i === 0 ? 13 : 10}
                strokeLinecap="round"
                strokeDasharray={i === 2 ? "8 3" : i === 1 ? "3 4" : undefined}
              />
              <circle
                cx={i === 0 ? 89 : i === 1 ? 95 : i === 2 ? 66 : 57}
                cy={i === 0 ? 24 : i === 1 ? 67 : i === 2 ? 55 : 39}
                r="4"
                fill="#3b3b32"
              />
            </svg>
            <strong>{s.name}</strong>
            <small>Illustrative sample {i + 1}</small>
          </button>
        ))}
      </div>
      <div className="sample-explanation">
        <span className="eyebrow">INFORMATIONAL SAMPLE · NO INFERENCE</span>
        <h3>{samples[sample].name}</h3>
        <p>{samples[sample].note}</p>
      </div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        ref={input}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (
            !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
            f.size > 8 * 1024 * 1024
          ) {
            setError("Choose a JPEG, PNG or WebP under 8 MB.");
            return;
          }
          if (preview) URL.revokeObjectURL(preview);
          setPreview(URL.createObjectURL(f));
          setError("");
        }}
      />
      <button className="outline-button" onClick={() => input.current?.click()}>
        <Upload size={15} />
        Preview your photo locally
      </button>
      {error && <p role="alert">{error}</p>}
      {preview && (
        <div className="uploaded-preview">
          <img src={preview} alt="Your locally selected snake image" />
          <p>
            Preview only. Model unavailable; no species, venom or danger
            determination.
          </p>
        </div>
      )}
      <p className="safety-note">
        Never approach or handle a snake to obtain a photo. An image cannot
        establish that a snake is harmless, rule out a bite, or determine
        antivenom treatment.
      </p>
    </>
  );
}
