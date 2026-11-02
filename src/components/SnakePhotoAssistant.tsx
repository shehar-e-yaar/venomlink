import { useEffect, useRef, useState } from "react";
import { ImagePlus, Upload, ScanLine, LoaderCircle } from "lucide-react";
import { classifySnake, type SpeciesMatch } from "../services/snakeClassifier";
export function SnakePhotoAssistant() {
  const [preview, setPreview] = useState<string | null>(null),
    [matches, setMatches] = useState<SpeciesMatch[]>([]),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    run = useRef(0);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(
    () => () => {
      run.current++;
    },
    [],
  );
  function choose(file?: File) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError("Choose a JPEG, PNG or WebP under 8 MB.");
      return;
    }
    run.current++;
    setPreview(URL.createObjectURL(file));
    setMatches([]);
    setError("");
    setStatus("");
    setBusy(false);
  }
  async function analyze() {
    if (!preview || busy) return;
    const token = ++run.current;
    setBusy(true);
    setMatches([]);
    setError("");
    try {
      const result = await classifySnake(preview, (s) => {
        if (token === run.current) setStatus(s);
      });
      if (token === run.current) {
        setMatches(result);
        setStatus("Analysis complete / Snake Teller classifier");
      }
    } catch (e) {
      if (token === run.current) {
        setError((e as Error).message);
        setStatus("");
      }
    } finally {
      if (token === run.current) setBusy(false);
    }
  }
  const uncertain =
    matches.length > 0 &&
    (matches[0].score < 0.5 || matches[0].score - matches[1].score < 0.1);
  return (
    <div className="snake-photo-assistant">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        aria-label="Choose snake image"
        onChange={(e) => choose(e.target.files?.[0])}
      />
      <div
        className={`snake-uploader ${preview ? "has-photo" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          choose(e.dataTransfer.files[0]);
        }}
      >
        {preview ? (
          <img src={preview} alt="Your selected snake photo" />
        ) : (
          <>
            <ImagePlus size={32} strokeWidth={1.2} />
            <strong>Start with a snake photo.</strong>
            <p>Drop an image here, or choose one below.</p>
            <button
              className="outline-button"
              onClick={() => input.current?.click()}
            >
              <Upload size={15} />
              Choose photo
            </button>
          </>
        )}
      </div>
      {preview && (
        <div className="snake-id-actions">
          <button className="dark-button" onClick={analyze} disabled={busy}>
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <ScanLine size={16} />
            )}{" "}
            {busy ? "Analyzing..." : "Identify species"}
          </button>
          <button
            className="quiet-link"
            onClick={() => input.current?.click()}
            disabled={busy}
          >
            Change photo
          </button>
        </div>
      )}
      {status && (
        <p className="photo-state" role="status" aria-live="polite">
          {status}
        </p>
      )}
      {error && (
        <p className="photo-state" role="alert">
          {error}
        </p>
      )}
      {matches.length > 0 && (
        <div className="snake-predictions">
          <small>
            {uncertain
              ? "UNCERTAIN MATCH / REVIEW REQUIRED"
              : "POSSIBLE SPECIES / NOT VERIFIED"}
          </small>
          <h3>{matches[0].name}</h3>
          <ol>
            {matches.map((m) => (
              <li key={m.name}>
                <span>{m.name}</span>
                <span>{(m.score * 100).toFixed(1)}% score</span>
              </li>
            ))}
          </ol>
          <p>
            Model scores are not proof of identification. This classifier can
            assign a snake label to a non-snake photo.
          </p>
        </div>
      )}
      <div className="snake-photo-footer">
        <p>
          Private, on-device analysis. Never handle a snake for a photo. A
          prediction does not determine venom, safety or treatment.
        </p>
      </div>
    </div>
  );
}
