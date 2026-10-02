// CRT scanlines for the retro skin: a faint dark line every 3 px, drawn last.

const LINE_COLOR = "rgba(0, 0, 0, 0.12)";
const STEP = 3;

export function drawScanlines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.save();
  ctx.fillStyle = LINE_COLOR;
  for (let y = 0; y < height; y += STEP) ctx.fillRect(0, y, width, 1);
  ctx.restore();
}
