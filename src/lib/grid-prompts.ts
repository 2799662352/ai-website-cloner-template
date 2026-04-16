const MULTI_CAM_NINE_PROMPT = `Multi-Angle / Multi-Shot 3×3 Keyframe Generator (No Labels on Frames)

<role>
You are a top-tier cinematic storyboard artist + cinematographer. Your task: based on ONE reference image, generate a **3×3 grid (9 frames)** of multi-angle, multi–shot-size keyframes.
You must **preserve the original scene exactly**: same subjects, same pose, same action, same expression, same props, same environment, same lighting, same time-of-day, same mood.
Only the **camera angle, shot size, composition, lens choice, and perspective** may change.
</role>

<input>
User provides: one reference image (image).
</input>

<non-negotiable rules – continuity & truthfulness>
1. **Do NOT change**: pose, gesture, movement, facial expression, clothing, props, objects, environment layout, lighting direction/quality, color palette, weather, time-of-day.
2. **Do NOT add**: new characters, new props, new objects, new light sources, new environmental elements.
3. **The moment must remain identical** across all 9 frames. Only the camera moves.
4. **All frames must obey physical camera logic**: every viewpoint must be spatially consistent with the environment in the reference image.
5. Depth of field: deeper for wider shots, shallower for closer shots, always natural.
6. Color grade must be identical across all 9 frames.
7. **NO labels, NO text, NO graphics may appear inside any frame.**

* (No KF numbers, no shot types, no duration text, nothing.)
</non-negotiable rules – continuity & truthfulness>

<goal>
Generate 9 coherent keyframes representing **the same frozen moment** captured from 9 different cinematic perspectives and shot sizes.
The output will be used to create multi-angle AI video variations.
</goal>

<step 1 – scene breakdown>
Output (with subheadings):
* **Subjects:** Identify all visible subjects in the reference image; describe appearance, pose, facing direction, spatial position.
* **Environment & Lighting:** Describe the environment layout, background elements, materials, light direction/quality, time-of-day, and atmosphere.
* **Visual Anchors:** List 3–6 visual traits that must remain unchanged across all frames (color tone, key props, light direction, environmental markers, etc.).
</step 1 – scene breakdown>

<step 2 – theme>
Output a single sentence describing the mood/theme conveyed by the original image (for stylistic coherence; does not change content).
</step 2 – theme>

<step 3 – cinematic approach>
Describe:
* **Shot strategy:** 9 frames covering a full range of perspectives and shot sizes (ELS, LS, MLS, MS, MCU, CU, ECU, high-angle, low-angle).
* **Camera approach:** fixed moment; only camera relocates (left/right, front/back, high/low, close/far).
* **Lens & DoF:** recommended focal lengths for each shot size and depth-of-field behavior.
* **Light & color:** must strictly match the reference image.
</step 3 – cinematic approach>

<step 4 – keyframes for AI video>
Output **9 keyframes**, using the format:
**[KF# | duration (sec) | shot type]**
* **Composition:** describe subject placement, perspective shift, foreground/mid/background.
* **Perspective:** describe camera position (e.g., left side, low-angle upshot, overhead, telephoto compression).
* **Camera:** height, angle, static or minimal motion.
* **Lens/DoF:** focal length, focus point, DoF depth.
* **Lighting/Grade:** identical to the reference image.

**Hard rules:**
* All 9 frames must preserve the same moment with zero pose/action changes.
* Includes mandatory shots: 1 extreme wide, 1 wide, 1 medium-wide, 1 medium, 1 medium-close, 1 close-up, 1 extreme close-up, 1 high-angle view, 1 low-angle view
* **NO text, NO labels, NO graphics inside the images.**
</step 4 – keyframes for AI video>

<step 5 – contact sheet output>
You must output **ONE single master image**: a 3×3 cinematic contact sheet containing all 9 keyframes.
Requirements:
1. 3×3 layout only.
2. Each frame = one unique camera angle/shot size.
3. No visual text labels inside any frame (strict).
4. Perfect continuity across all 9 frames.
5. After the master contact sheet, output the full KF text descriptions for rerendering any frame.
</step 5 – contact sheet output>

<final output format>
A) Scene Breakdown
B) Theme
C) Cinematic Approach
D) Keyframes
E) ONE 3×3 Master Contact Sheet Image
</final output format>`;

const PLOT_PUSH_FOUR_PROMPT = `Based on the provided reference image, generate a **2×2 grid (4 frames)** showing a 4-beat narrative progression of this scene.

Frame 1 (top-left): The moment just before the current scene — establish context.
Frame 2 (top-right): The current moment as shown in the reference image — match exactly.
Frame 3 (bottom-left): The next beat — a natural continuation of the action.
Frame 4 (bottom-right): The resolution — the scene settles or transitions.

Rules:
- Maintain the same characters, environment, lighting, and color grade across all 4 frames.
- Only the action/pose may progress naturally. No new characters or props.
- NO text, labels, or graphics inside any frame.
- Output ONE single 2×2 contact sheet image.`;

const GRID_25_PROMPT = `Based on the provided reference image, generate a **5×5 grid (25 frames)** of continuous storyboard keyframes.

The 25 frames should tell a coherent visual story spanning approximately 30 seconds of screen time, with the reference image as the midpoint (frame 13).

Frames 1-12: Build-up leading to the reference image moment.
Frame 13: Match the reference image exactly.
Frames 14-25: Continuation after the reference moment.

Rules:
- Maintain character consistency, environment, and color grade throughout.
- Camera angles and shot sizes should vary cinematically across the sequence.
- NO text, labels, or graphics inside any frame.
- Output ONE single 5×5 contact sheet image.`;

const CHAR_TRI_VIEW_PROMPT = `Based on the provided reference image, generate a **1×3 grid (3 frames)** showing character orthographic views.

Frame 1 (left): Front view — character facing directly toward camera.
Frame 2 (center): Side view (3/4 or full profile) — character turned 90 degrees.
Frame 3 (right): Back view — character facing away from camera.

Rules:
- Identical character: same clothing, accessories, proportions, colors.
- Neutral pose, standing straight, arms slightly away from body for visibility.
- Clean, simple background (light gray or white).
- NO text, labels, or graphics inside any frame.
- Output ONE single 1×3 horizontal contact sheet image.`;

export const GRID_PROMPTS: Record<string, () => string> = {
  "multi-cam-nine": () => MULTI_CAM_NINE_PROMPT,
  "plot-push-four": () => PLOT_PUSH_FOUR_PROMPT,
  "grid-25": () => GRID_25_PROMPT,
  "char-tri-view": () => CHAR_TRI_VIEW_PROMPT,
};
