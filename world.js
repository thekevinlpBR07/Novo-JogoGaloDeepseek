(function (root) {
  const node = typeof module !== 'undefined';
  const Map = node ? require('./yard-map.js') : root.YardMap;
  const District = node ? require('./district-map.js') : root.DistrictMap;

  // O quintal deixou de ser uma sala fechada: ele e o canto noroeste do bairro.
  // As coordenadas nao mudaram, so o limite deixou de ser um retangulo de 640.
  const W = {
    size: Map.SIZE,
    tile: Map.TILE,
    spawn: { x: 302, y: 295 },
    trees: [],
    district: District,
    width: District.WIDTH,
    height: District.HEIGHT,
  };

  Object.defineProperty(W, 'blocks', { get: () => [...Map.blocks(), ...District.solids()] });
  Object.defineProperty(W, 'objects', { get: () => [...Map.interactions(), ...District.interactions()] });

  W.getObjects = s => [...Map.interactions(s), ...District.interactions(s)];

  // O portao do quintal so abre depois da rotina do primeiro dia (E001).
  W.gateLocked = s => !!s?.story?.firstDay?.enabled && s.events?.flags?.E001 !== true;

  W.blocked = (x, y, s) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return true;
    if (District.blocked(x, y)) return true;

    const obstacles = [
      ...Map.blocks(s),
      ...(W.gateLocked(s) ? [{ x: 544, y: 250, w: 8, h: 64 }] : []),
      ...(s?.world?.objects?.firstPen ? [{ x: 185, y: 345, w: 108, h: 80 }] : []),
      // Curral de reproducao (Secao 5.9/11.7): fica livre so depois de E009.
      ...(s?.events?.flags?.E009 ? [{ x: 110, y: 440, w: 100, h: 70 }] : []),
    ];

    return obstacles.some(b => x > b.x - 7 && x < b.x + b.w + 7 && y > b.y - 3 && y < b.y + b.h + 5);
  };

  W.inYard = (x, y) => District.inYard(x, y);

  W.valid = (s, map) =>
    s &&
    s.version === 1 &&
    Number.isFinite(s.x) &&
    Number.isFinite(s.y) &&
    (s.room === 'home' ? root.HOUSE && !root.HOUSE.blocked(s.x, s.y) : (!s.room || s.room === 'yard') && !W.blocked(s.x, s.y, map)) &&
    Array.isArray(s.visited) &&
    s.visited.every(v => ['friend', 'coop', 'garden'].includes(v));

  W.normalize = s => {
    if (
      !s ||
      s.version !== 1 ||
      !Number.isFinite(s.x) ||
      !Number.isFinite(s.y) ||
      !Array.isArray(s.visited) ||
      !s.visited.every(v => ['friend', 'coop', 'garden'].includes(v)) ||
      !['yard', 'home', undefined].includes(s.room)
    )
      return null;

    const n = { ...s };
    if (!W.valid(n)) Object.assign(n, n.room === 'home' ? root.HOUSE.spawn : W.spawn);
    return n;
  };

  root.WORLD = W;
  if (node) module.exports = W;
})(typeof window === 'undefined' ? globalThis : window);
