# Demonstration recording notes

The public video is a short narrated walkthrough assembled from actual application screenshots with synthetic narration. It is explicitly not a continuous screen recording. The complete narration and scene order are in walkthrough.json; VIDEO_METADATA.json records the rendered duration. The video page provides captions and a transcript link.

Show the map, the actual S3 lineage, the hypothetical upgrade and crossing-delay results, a real AWS locality response, the architecture status, actual route/traffic details, and the clearly labeled non-inference photo helper. Keep provider attribution visible. Never call the optional Iceberg/AI extensions live, a locality a hospital, or modeled sample counts population coverage.

To reproduce on Windows after capturing the current app into submission/screenshots:

```powershell
.\pipeline\narrate.ps1
python pipeline/build_walkthrough.py
python pipeline/caption_walkthrough.py
```

Pillow and imageio-ffmpeg are required for video assembly. The project-local .tools installation can supply the encoder. Aim below 2:59; the builder rejects a narration longer than three minutes. The screenshot walkthrough can be replaced by the owner's continuous screen recording using the same scene order.
