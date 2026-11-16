import * as T from 'three';

/** Original painted-but-procedural sky for the live WebGL battle.
 * A background texture is not a screenshot or UI overlay: the moving ships,
 * water, shots, aiming and touch controls stay fully interactive.
 * Kept battle-only so the approved Porto scene is not restyled.
 */
export function createBattleSkyTexture(): T.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D required for the naval sky');
  const paint = ctx;

  const sky = paint.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#1769ae');
  sky.addColorStop(.24, '#288bce');
  sky.addColorStop(.57, '#59b7e5');
  sky.addColorStop(.86, '#a3d7eb');
  sky.addColorStop(1, '#d8e7d9');
  paint.fillStyle = sky;
  paint.fillRect(0, 0, 1024, 1024);

  // Warm sunlit atmosphere: blends behind 3D models rather than occluding them.
  const sunlight = paint.createRadialGradient(175, 120, 2, 175, 120, 500);
  sunlight.addColorStop(0, 'rgba(255,243,194,.49)');
  sunlight.addColorStop(.45, 'rgba(255,228,165,.14)');
  sunlight.addColorStop(1, 'rgba(255,235,189,0)');
  paint.fillStyle = sunlight;
  paint.fillRect(0, 0, 750, 700);

  // Layered cumulus volumes: diffuse shaded bases, bright individual lobes.
  // Every shape is drawn locally, with no network assets or borrowed artwork.
  function puff(cx: number, cy: number, radius: number, shade = false) {
    paint.save();
    paint.translate(cx, cy);
    paint.scale(1.23, .57);
    const fog = paint.createRadialGradient(-radius * .16, -radius * .21, radius * .05, 0, 0, radius);
    if (shade) {
      fog.addColorStop(0, 'rgba(93,141,165,.46)');
      fog.addColorStop(.65, 'rgba(135,173,190,.30)');
      fog.addColorStop(1, 'rgba(145,177,196,0)');
    } else {
      fog.addColorStop(0, 'rgba(255,255,249,.81)');
      fog.addColorStop(.51, 'rgba(247,251,247,.58)');
      fog.addColorStop(.8, 'rgba(239,250,246,.24)');
      fog.addColorStop(1, 'rgba(244,253,251,0)');
    }
    paint.fillStyle = fog;
    paint.beginPath();
    paint.arc(0, 0, radius, 0, Math.PI * 2);
    paint.fill();
    paint.restore();
  }

  // Reference 02 has illuminated cumulus banks ABOVE the horizon as well
  // as at sea level. The earlier texture only put clouds in its lowest band,
  // leaving most of a 390x844 live battle as a featureless blue rectangle.
  // Original procedural paint, not a screenshot or a transparent UI layer.
  const banks: [number, number, number][] = [
    [-52, 192, 65], [186, 217, 57], [438, 172, 72],
    [706, 227, 58], [1032, 193, 78],
    [24, 340, 74], [272, 319, 83], [531, 348, 68],
    [818, 308, 89], [1081, 358, 79],
    [-38, 460, 78], [157, 478, 69], [371, 429, 88],
    [615, 474, 76], [868, 442, 82], [1058, 476, 78],
    [65, 568, 56], [315, 566, 64], [585, 580, 59],
    [831, 568, 61], [1044, 577, 65]
  ];
  for (let i = 0; i < banks.length; i++) {
    const [cx, cy, size] = banks[i];
    puff(cx, cy + size * .19, size * 1.14, true);
    for (let j = 0; j < 7; j++) {
      const angle = Math.PI * (j / 6);
      const x = cx + Math.cos(angle) * size * .75;
      const y = cy + Math.sin(angle) * size * .12 - (j % 3) * size * .18;
      puff(x, y, size * (.49 + (j % 3) * .075));
    }
    puff(cx - size * .12, cy - size * .22, size * .67);
  }

  // High, subtle wind-sheared cirrus gives the upper blue space scale
  // without adding draw calls or obstructing a cannon/HP button.
  paint.save();
  paint.lineCap = 'round';
  for (let i = 0; i < 11; i++) {
    const x = (i * 173 + 47) % 1024, y = 87 + (i * 31) % 252;
    paint.strokeStyle = i % 3 === 0 ? 'rgba(249,253,248,.18)' : 'rgba(248,253,255,.11)';
    paint.lineWidth = 7 + i % 4 * 3;
    paint.beginPath();
    paint.moveTo(x - 72, y + 15);
    paint.bezierCurveTo(x - 23, y - 10, x + 42, y + 14, x + 112, y - 9);
    paint.stroke();
  }
  paint.restore();

  // Pale cloud banks near the horizon give the sea a convincing depth cue.
  const haze = paint.createLinearGradient(0, 675, 0, 940);
  haze.addColorStop(0, 'rgba(239,249,245,0)');
  haze.addColorStop(.56, 'rgba(243,247,235,.21)');
  haze.addColorStop(1, 'rgba(242,245,231,.36)');
  paint.fillStyle = haze;
  paint.fillRect(0, 675, 1024, 265);

  // Distant, illuminated cloud shelf and scattered blue-grey weather layers.
  // The approved illustration has depth behind the galleon, not an empty sky.
  // All strokes are generated locally on the battle sky, never overlaying HUD.
  paint.save();
  const horizonShelf = paint.createLinearGradient(0, 610, 0, 850);
  horizonShelf.addColorStop(0, 'rgba(52,114,150,0)');
  horizonShelf.addColorStop(.47, 'rgba(45,109,147,.14)');
  horizonShelf.addColorStop(.75, 'rgba(244,248,232,.30)');
  horizonShelf.addColorStop(1, 'rgba(255,249,215,0)');
  paint.fillStyle = horizonShelf;
  paint.fillRect(0, 610, 1024, 240);
  for (let i = 0; i < 13; i++) {
    const cx = (i * 113 + 39) % 1130 - 50;
    const cy = 672 + Math.sin(i * 1.9) * 45;
    const width = 65 + (i % 4) * 28;
    const cloud = paint.createRadialGradient(cx, cy, 5, cx, cy, width);
    cloud.addColorStop(0, i % 3 === 0 ? 'rgba(251,252,231,.28)' : 'rgba(241,251,248,.33)');
    cloud.addColorStop(.55, 'rgba(226,242,243,.20)');
    cloud.addColorStop(1, 'rgba(222,246,250,0)');
    paint.save();
    paint.translate(cx, cy);
    paint.scale(1.9, .48);
    paint.translate(-cx, -cy);
    paint.fillStyle = cloud;
    paint.beginPath();
    paint.arc(cx, cy, width, 0, Math.PI * 2);
    paint.fill();
    paint.restore();
  }
  paint.restore();

  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
