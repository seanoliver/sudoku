# Share clip shows the app in one corner on gray

## Symptom
The PR #65 clip (`docs/screenshots/selection-outline-post.mp4`, 780 × 1688) showed the app at 390 × 844 in the top-left corner. The rest of the frame was solid gray. It looked broken in the Typefully draft preview.

## Root cause
Playwright's `recordVideo` records frames at CSS-pixel size and ignores `deviceScaleFactor`. The recording set `recordVideo.size` to 780 × 1688 (2x the 390 × 844 viewport). Playwright filled the extra area with gray `#808080`. Nothing checked the frames before upload.

## Reproduction
Record a 390 × 844 page with `recordVideo: { size: { width: 780, height: 1688 } }`. Extract any frame. The bottom-right region is all value 128.

## Fix
Cropped the existing clip to the content and upscaled it:
`ffmpeg -i orig.mp4 -vf "crop=390:844:0:0,scale=780:1688:flags=lanczos,format=yuv420p" -c:v libx264 -crf 16 -movflags +faststart -an out.mp4`.
Uploaded it to Typefully draft 11165730, which replaced the clip on the X and Threads posts. The post text and the Substack Note's still were unchanged.

## Verification
- Extracted frames at 0.5s and 5.5s and inspected them. The app fills the frame.
- `check-clip.sh` fails the old clip on all six edge samples and passes the new one. It also fails Playwright test clips with a 2x video size and with an 860px viewport (a thin right strip), and passes the dark canvas.
- Re-fetched the draft. The post text was identical, and X and Threads had the new media ID.

## Recurrence guardrail
- `.claude/skills/capturing-share-screenshots/SKILL.md`, "Clips": set `recordVideo.size` equal to the viewport, drop reduced motion, upscale with ffmpeg, and run `check-clip.sh` plus a frame inspection.
- The global `typefully` skill: inspect every image and video frame before `media:upload`.
