// DNA visual (Secao a definir na Biblia) - cada galo/galinha que nasce recebe
// uma aparencia propria gerada geneticamente (cor por regiao, padrao,
// porte, inclinacao de cabeca), permanente e herdavel. O jogador nunca edita
// isso; e so um objeto de dados usado pelo renderizador (fight-dna.js).
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined';

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h /= 6;
    }
    return [h, s, l];
  }
  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  function hslToRgb(h, s, l) {
    if (s === 0) { const v = l * 255; return [v, v, v]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255];
  }
  function hexToRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }

  // Ruido gaussiano aproximado a partir do rng() uniforme do projeto (Irwin-Hall
  // com 3 amostras, mais barato que Box-Muller e suficiente pra variacao de gene).
  function gaussian(rng) { return (rng() + rng() + rng() - 1.5) / 1.5; }

  const REGIONS = ['dorso', 'peito', 'cauda'];
  // Paleta natural de plumagem (vermelho-marrom-dourado). Mutacao de matiz fica
  // dentro dessa faixa pra nunca sortear um galo roxo/azul puro.
  const NATURAL_HUE_RANGE = 0.16;

  function randomRegionColor(rng) {
    const h = rng() * NATURAL_HUE_RANGE;
    const s = 0.3 + rng() * 0.45;
    const l = 0.12 + rng() * 0.35;
    return rgbToHex(...hslToRgb(h, s, l));
  }

  // Distancia euclidiana em RGB - so pra decidir "essas duas cores parecem
  // farinha do mesmo saco" (region contrast), nao usado pra nada visual.
  function colorDistance(hexA, hexB) {
    const [ra, ga, ba] = hexToRgb(hexA);
    const [rb, gb, bb] = hexToRgb(hexB);
    return Math.hypot(ra - rb, ga - gb, ba - bb);
  }

  // Pequena variacao em cima de uma cor base (mesmo matiz, luminosidade/
  // saturacao levemente diferentes) - usado pra plumagem "solida" de
  // proposito: as 3 regioes ficam parecidas, mas nao pixel-a-pixel identicas
  // (senao perde a pincelada/sombra ja preservada pelo recolorRegion).
  function jitterColor(hex, rng, amount) {
    const [r, g, b] = hexToRgb(hex);
    const [h, s, l] = rgbToHsl(r, g, b);
    return rgbToHex(...hslToRgb(h, clamp(s + gaussian(rng) * amount, 0.05, 0.9), clamp(l + gaussian(rng) * amount, 0.05, 0.75)));
  }

  // Cor nova garantidamente distinguivel das ja escolhidas (contraste minimo
  // MIN_REGION_CONTRAST) - usado pra plumagem "variada" de proposito, pra nao
  // depender de sorte pra render mostrar as 3 regioes separadas de verdade.
  const MIN_REGION_CONTRAST = 34;
  function distinctRegionColor(rng, avoid) {
    let best = randomRegionColor(rng), bestMin = -1;
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = randomRegionColor(rng);
      const minDist = Math.min(...avoid.map(hex => colorDistance(candidate, hex)));
      if (minDist > bestMin) { best = candidate; bestMin = minDist; }
      if (minDist >= MIN_REGION_CONTRAST) return candidate;
    }
    return best; // nao achou o ideal em 8 tentativas: usa o mais contrastante que rolou
  }

  // Plumagem "solida" (as 3 regioes claramente da mesma familia de cor) e
  // "variada" (contraste garantido entre regioes) sao uma escolha genetica
  // deliberada, nao um acaso de quem-sorteou-parecido - Secao a definir.
  function rollRegionColors(rng, solid) {
    const colors = { dorso: randomRegionColor(rng) };
    if (solid) {
      colors.peito = jitterColor(colors.dorso, rng, 0.08);
      colors.cauda = jitterColor(colors.dorso, rng, 0.08);
    } else {
      colors.peito = distinctRegionColor(rng, [colors.dorso]);
      colors.cauda = distinctRegionColor(rng, [colors.dorso, colors.peito]);
    }
    return colors;
  }

  // Anatomia rara "topo": nasce com ~3% de chance em aves de origem, herdavel.
  // A cauda dela e azul-petroleo iridescente (identidade da anatomia), entao
  // usa uma faixa de matiz propria so pra cauda; dorso/peito seguem a paleta natural.
  const TOPO_ORIGIN_CHANCE = 0.03;
  const TOPO_MUTATION_CHANCE = 0.015;
  function topoTailColor(rng) {
    return rgbToHex(...hslToRgb(0.47 + rng() * 0.08, 0.45 + rng() * 0.25, 0.18 + rng() * 0.16));
  }

  function randomVisualDna(rng) {
    const topo = rng() < TOPO_ORIGIN_CHANCE;
    const solid = topo ? false : rng() < 0.3;
    const colors = rollRegionColors(rng, solid);
    if (topo) colors.cauda = topoTailColor(rng);
    const hasPattern = rng() < 0.35;
    return {
      version: 1,
      ...(topo ? { bodyType: 'topo' } : {}),
      solid,
      colors,
      pattern: hasPattern ? {
        type: rng() < 0.5 ? 'malhado' : 'carijo',
        seed: Math.floor(rng() * 1e6),
        count: hasPattern && rng() < 0.5 ? Math.round(4 + rng() * 4) : Math.round(16 + rng() * 16),
        spot: rgbToHex(...hslToRgb(0.13 + rng() * 0.05, 0.15 + rng() * 0.1, 0.82 + rng() * 0.12)),
      } : null,
      heightScale: clamp(1 + gaussian(rng) * 0.1, 0.82, 1.18),
      bulkScale: clamp(1 + gaussian(rng) * 0.1, 0.82, 1.22),
      headTilt: clamp(gaussian(rng) * 6, -10, 10),
      mutated: false,
    };
  }

  function blendGeneColor(hexA, hexB, rng, mutationChance) {
    const [ha] = rgbToHsl(...hexToRgb(hexA));
    const [hb] = rgbToHsl(...hexToRgb(hexB));
    const [, sa, la] = rgbToHsl(...hexToRgb(hexA));
    const [, sb, lb] = rgbToHsl(...hexToRgb(hexB));
    const ax = Math.cos(ha * 2 * Math.PI) + Math.cos(hb * 2 * Math.PI);
    const ay = Math.sin(ha * 2 * Math.PI) + Math.sin(hb * 2 * Math.PI);
    let h = Math.atan2(ay, ax) / (2 * Math.PI); if (h < 0) h += 1;
    let s = (sa + sb) / 2, l = (la + lb) / 2;
    h += gaussian(rng) * 0.02; s += gaussian(rng) * 0.05; l += gaussian(rng) * 0.04;
    let mutated = false;
    if (rng() < mutationChance) { h = rng() * NATURAL_HUE_RANGE; s = 0.25 + rng() * 0.55; mutated = true; }
    h = ((h % 1) + 1) % 1; s = clamp(s, 0.05, 0.9); l = clamp(l, 0.05, 0.75);
    return { hex: rgbToHex(...hslToRgb(h, s, l)), mutated };
  }

  // GERAR_FILHOTE (visual): media dos pais por gene + ruido + mutacao rara.
  // Traços continuos (cor, porte, inclinacao) sempre misturam os dois pais -
  // nunca escolhe um ou outro, entao o filhote sempre "puxa um pouco de cada".
  function inheritVisualDna(motherDna, fatherDna, rng, mutationChance = 0.06) {
    // "Solido" e "variado" sao tratados como um gene categorico simples: se os
    // pais concordam, o filhote fica igual (com uma pequena chance de virar);
    // se discordam, e 50/50. Isso evita que a mistura continua de cor por si
    // so decida sem querer se a ave vai parecer solida ou nao.
    const mTopo = motherDna.bodyType === 'topo', fTopo = fatherDna.bodyType === 'topo';
    const topo = mTopo && fTopo ? true : mTopo || fTopo ? rng() < 0.5 : rng() < TOPO_MUTATION_CHANCE;
    let solid = motherDna.solid === fatherDna.solid ? motherDna.solid : rng() < 0.5;
    if (rng() < mutationChance * 0.5) solid = !solid;
    if (topo) solid = false;

    const colors = {};
    let mutated = false;
    for (const region of REGIONS) {
      // Cada regiao e um gene independente: 35% vem quase igual da mae, 35% do pai,
      // 30% e a mistura dos dois. Assim irmaos diferem (um puxa o dorso da mae,
      // outro o peito do pai) em vez de todos virarem a media.
      const roll = rng();
      const from = roll < 0.35 ? motherDna.colors[region] : roll < 0.7 ? fatherDna.colors[region] : null;
      const { hex, mutated: m } = from
        ? blendGeneColor(from, from, rng, mutationChance)
        : blendGeneColor(motherDna.colors[region], fatherDna.colors[region], rng, mutationChance);
      colors[region] = hex;
      mutated = mutated || m;
    }
    // Depois de misturar geneticamente, reforca a intencao solido/variado -
    // sem isso, dois pais "variados" as vezes geram filho com regioes
    // parecidas por coincidencia da media, ou vice-versa.
    if (solid) {
      colors.peito = jitterColor(colors.dorso, rng, 0.06);
      colors.cauda = jitterColor(colors.dorso, rng, 0.06);
    } else {
      if (colorDistance(colors.peito, colors.dorso) < MIN_REGION_CONTRAST) colors.peito = distinctRegionColor(rng, [colors.dorso]);
      if (colorDistance(colors.cauda, colors.dorso) < MIN_REGION_CONTRAST || colorDistance(colors.cauda, colors.peito) < MIN_REGION_CONTRAST) {
        colors.cauda = distinctRegionColor(rng, [colors.dorso, colors.peito]);
      }
    }
    if (topo) {
      const topoParent = mTopo ? motherDna : fTopo ? fatherDna : null;
      colors.cauda = topoParent ? jitterColor(topoParent.colors.cauda, rng, 0.05) : topoTailColor(rng);
    }
    const parentPattern = motherDna.pattern || fatherDna.pattern;
    const pattern = parentPattern && rng() < 0.5 ? {
      type: (motherDna.pattern || fatherDna.pattern).type,
      seed: Math.floor(rng() * 1e6),
      count: (motherDna.pattern || fatherDna.pattern).count,
      spot: rgbToHex(...hslToRgb(0.13 + rng() * 0.05, 0.15 + rng() * 0.1, 0.82 + rng() * 0.12)),
    } : null;
    const heightScale = clamp((motherDna.heightScale + fatherDna.heightScale) / 2 + gaussian(rng) * 0.05, 0.82, 1.18);
    const bulkScale = clamp((motherDna.bulkScale + fatherDna.bulkScale) / 2 + gaussian(rng) * 0.05, 0.82, 1.22);
    const headTilt = clamp((motherDna.headTilt + fatherDna.headTilt) / 2 + gaussian(rng) * 3, -10, 10);
    return { version: 1, ...(topo ? { bodyType: 'topo' } : {}), solid, colors, pattern, heightScale, bulkScale, headTilt, mutated };
  }

  function valid(dna) {
    const num = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
    const hex = v => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
    if (!dna || dna.version !== 1) return false;
    // solid e opcional (saves migrados antes desse gene existir continuam
    // validos - so nao ganham o comportamento deliberado ate o proximo
    // nascimento/cruzamento).
    if (dna.solid !== undefined && typeof dna.solid !== 'boolean') return false;
    if (dna.bodyType !== undefined && dna.bodyType !== 'topo') return false;
    if (!dna.colors || !REGIONS.every(r => hex(dna.colors[r]))) return false;
    if (dna.pattern) {
      if (!['malhado', 'carijo'].includes(dna.pattern.type)) return false;
      if (!Number.isSafeInteger(dna.pattern.seed) || !Number.isSafeInteger(dna.pattern.count) || !hex(dna.pattern.spot)) return false;
    } else if (dna.pattern !== null) return false;
    if (!num(dna.heightScale, 0.7, 1.3) || !num(dna.bulkScale, 0.7, 1.3) || !num(dna.headTilt, -15, 15)) return false;
    if (typeof dna.mutated !== 'boolean') return false;
    return true;
  }

  const VisualDna = { REGIONS, randomVisualDna, inheritVisualDna, valid, hexToRgb, rgbToHex, rgbToHsl, hslToRgb };
  root.VisualDna = VisualDna;
  if (node) module.exports = VisualDna;
})(typeof window === 'undefined' ? globalThis : window);
