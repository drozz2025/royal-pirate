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
      fog.addColorStop(0, 'rgba(255,255,249,.97)');
      fog.addColorStop(.51, 'rgba(247,251,247,.85)');
      fog.addColorStop(.8, 'rgba(239,250,246,.48)');
      fog.addColorStop(1, 'rgba(244,253,251,0)');
    }
    paint.fillStyle = fog;
    paint.beginPath();
    paint.arc(0, 0, radius, 0, Math.PI * 2);
    paint.fill();
    paint.restore();
  }

  const banks: [number, number, number][] = [
    // Keep the upper sky open, as in the approved screenshot; place soft
    // cloud banks near the horizon instead of giant foreground white blobs.
    [-50, 420, 100], [185, 460, 95], [450, 395, 90],
    [770, 440, 85], [1035, 415, 105], [85, 550, 75],
    [380, 570, 95], [690, 540, 90], [980, 565, 110]
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

  // Pale cloud banks near the horizon give the sea a convincing depth cue.
  const haze = paint.createLinearGradient(0, 675, 0, 940);
  haze.addColorStop(0, 'rgba(239,249,245,0)');
  haze.addColorStop(.56, 'rgba(243,247,235,.21)');
  haze.addColorStop(1, 'rgba(242,245,231,.36)');
  paint.fillStyle = haze;
  paint.fillRect(0, 675, 1024, 265);

  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
