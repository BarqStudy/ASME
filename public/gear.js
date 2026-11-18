const canvas = document.querySelector('#intro canvas');
if (canvas && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const ctx = canvas.getContext('2d');
  const teeth = 14;
  const steps = teeth * 4;
  const faces = [];
  const ring = (i, radius, z) => {
    const a = i / steps * Math.PI * 2;
    return [Math.cos(a) * radius, Math.sin(a) * radius, z];
  };
  for (let i = 0; i < steps; i++) {
    const j = i + 1;
    const r1 = i % 4 === 1 || i % 4 === 2 ? 79 : 65;
    const r2 = j % 4 === 1 || j % 4 === 2 ? 79 : 65;
    const a = ring(i, r1, 13), b = ring(j, r2, 13);
    const c = ring(i, r1, -13), d = ring(j, r2, -13);
    const e = ring(i, 28, 13), f = ring(j, 28, 13);
    const g = ring(i, 28, -13), h = ring(j, 28, -13);
    faces.push({ points:[a,b,f,e], color:'#83c4ed' }, { points:[c,g,h,d], color:'#245174' },
      { points:[c,d,b,a], color:i % 2 ? '#36759f' : '#2a5f85' }, { points:[g,e,f,h], color:'#163e5e' });
  }
  const started = performance.now();
  function paint(now) {
    const t = Math.min(1, (now - started) / 750);
    const spin = -1.1 + 1.7 * t;
    const tilt = 0.94 - 0.43 * t;
    const project = ([x,y,z]) => {
      const sx = x * Math.cos(spin) - y * Math.sin(spin);
      const sy = x * Math.sin(spin) + y * Math.cos(spin);
      const depth = sy * Math.sin(tilt) + z * Math.cos(tilt);
      const scale = 350 / (350 - depth);
      return [100 + sx * scale, 100 + (sy * Math.cos(tilt) - z * Math.sin(tilt)) * scale, depth];
    };
    ctx.clearRect(0, 0, 200, 200);
    const projected = faces.map(({ points, color }) => {
      const vertices = points.map(project);
      return { vertices, color, depth:vertices.reduce((sum, vertex) => sum + vertex[2], 0) / vertices.length };
    }).sort((a,b) => a.depth - b.depth);
    for (const { vertices, color } of projected) {
      ctx.beginPath();
      vertices.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.75;
      ctx.fill();
      ctx.stroke();
    }
    if (t < 1) requestAnimationFrame(paint);
  }
  requestAnimationFrame(paint);
}
