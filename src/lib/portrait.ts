import sharp from "sharp";

// Portrait dessiné au crayon graphite, tiré d'une image des vidéos de la chaîne ou de la fiche auteur.
// Deux couches, comme un dessinateur :
//  1. le trait : de courts traits de crayon qui suivent la direction des contours (yeux, bouche, chevelure) ;
//  2. le modelé : les valeurs de l'image (ombres, volumes) rendues par des hachures de graphite sur papier grainé.
// Les bords sont laissés « non finis » et se perdent dans le blanc. Le résultat est une image PNG en niveaux de gris.

const SIZE = 480;
const DIRECTIONS = 8;
const STROKE = 9; // longueur des traits, en pixels

type Plane = Float32Array;

function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

// Somme le long d'un segment orienté (filtre « trait de crayon »).
function lineFilter(src: Plane, w: number, angle: number, length: number): Plane {
  const out = new Float32Array(src.length);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const half = (length - 1) / 2;
  const offsets: [number, number][] = [];
  for (let t = -half; t <= half; t++) offsets.push([Math.round(t * dx), Math.round(t * dy)]);
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (const [ox, oy] of offsets) {
        const xx = x + ox;
        const yy = y + oy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < w) sum += src[yy * w + xx];
      }
      out[y * w + x] = sum / offsets.length;
    }
  }
  return out;
}

export async function drawPortrait(image: Buffer): Promise<string> {
  const w = SIZE;
  const base = sharp(image).resize(w, w, { fit: "cover", position: sharp.strategy.attention }).grayscale().normalise();
  const grayBuf = await base.clone().blur(0.7).raw().toBuffer();
  const smoothBuf = await base.clone().blur(1.1).raw().toBuffer();
  const gray = Float32Array.from(grayBuf, (v) => v / 255);
  const smooth = Float32Array.from(smoothBuf, (v) => v / 255);
  const at = (p: Plane, x: number, y: number) => p[Math.min(w - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];

  // 1. Le trait : gradient, classé par direction, puis redessiné en traits orientés.
  const grad = new Float32Array(w * w);
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const gx = at(gray, x + 1, y) - at(gray, x - 1, y);
      const gy = at(gray, x, y + 1) - at(gray, x, y - 1);
      grad[y * w + x] = Math.hypot(gx, gy);
    }
  }
  const angles = Array.from({ length: DIRECTIONS }, (_, i) => (i * Math.PI) / DIRECTIONS);
  const responses = angles.map((a) => lineFilter(grad, w, a, STROKE));
  const lines = new Float32Array(w * w);
  for (let d = 0; d < DIRECTIONS; d++) {
    const classified = new Float32Array(w * w);
    for (let i = 0; i < w * w; i++) {
      let best = 0;
      for (let k = 1; k < DIRECTIONS; k++) if (responses[k][i] > responses[best][i]) best = k;
      if (best === d) classified[i] = grad[i];
    }
    const drawn = lineFilter(classified, w, angles[d], STROKE);
    for (let i = 0; i < w * w; i++) lines[i] += drawn[i];
  }
  let maxLine = 0;
  for (const v of lines) maxLine = Math.max(maxLine, v);
  const lineScale = maxLine > 0 ? 1 / (maxLine * 0.45) : 0;

  // 2. Le modelé : texture de hachures (bruit étiré) et grain du papier.
  const rnd = random(20261027);
  const noise = new Float32Array(w * w).map(() => rnd());
  const hatchA = lineFilter(noise, w, Math.PI / 4, 15);
  const hatchB = lineFilter(noise, w, (3 * Math.PI) / 4, 15);
  const norm = (p: Plane) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of p) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    return p.map((v) => (v - lo) / (hi - lo || 1));
  };
  const hA = norm(hatchA);
  const hB = norm(hatchB);
  const patches = norm(Float32Array.from(await sharp(Buffer.from(noise.map((v) => v * 255)), { raw: { width: w, height: w, channels: 1 } }).blur(20).raw().toBuffer()));

  const out = Buffer.alloc(w * w);
  const c = w / 2;
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      // Valeur visée : l'image éclaircie, avec des noirs profonds conservés (graphite gras).
      const tone = Math.pow(smooth[i], 0.62);
      // Hachures : une direction dans les demi-teintes, croisées dans les ombres.
      const dark = 1 - tone;
      const hatch = 1 - dark * (0.55 * hA[i] + (dark > 0.45 ? 0.45 * hB[i] : 0)) * 0.9;
      let v = tone * 0.6 + hatch * tone * 0.4;
      // Détail fin (rides, mèches) : on renforce ce qui s'écarte de son voisinage.
      v += (gray[i] - smooth[i]) * 0.9;
      // Trait de crayon par-dessus.
      const stroke = Math.min(1, lines[i] * lineScale);
      v *= 1 - 0.6 * stroke;
      // Grain du papier, très léger.
      v *= 0.96 + 0.04 * noise[i];
      // Bords non finis, irréguliers.
      const r = Math.hypot(x - c, (y - c) * 0.85) / c + (patches[i] - 0.5) * 0.5 + (hA[i] - 0.5) * 0.1;
      const fade = Math.min(1, Math.max(0, (r - 0.48) / 0.4));
      v = v + (1 - v) * fade;
      out[i] = Math.round(Math.max(0, Math.min(1, v)) * 255);
    }
  }

  const png = await sharp(out, { raw: { width: w, height: w, channels: 1 } }).toColourspace("b-w").png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

// Télécharge l'image (vignette YouTube ou photo de la fiche auteur) et la dessine ; ne renvoie rien en cas d'échec.
export async function drawPortraitFromUrl(url: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return null;
    return await drawPortrait(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
}
