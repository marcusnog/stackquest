(() => {
  let observer;
  function mount() {
    observer?.disconnect();
    const canvas = document.querySelector("canvas#blueprint");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";

    function draw() {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#102439";
      ctx.fillRect(0, 0, width, height);
      const scale = Math.min(width / 390, height / 230);
      ctx.translate((width - 390 * scale) / 2, (height - 230 * scale) / 2);
      ctx.scale(scale, scale);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      function path(points, stroke, fill, weight = 1) {
        ctx.beginPath();
        points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        if (fill) {
          ctx.closePath();
          ctx.fillStyle = fill;
          ctx.fill();
        }
        if (stroke) {
          ctx.lineWidth = weight;
          ctx.strokeStyle = stroke;
          ctx.stroke();
        }
      }
      function ellipse(x, y, rx, ry, fill, stroke) {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      function label(text, x, y) {
        ctx.fillStyle = "#9ab4c8";
        ctx.font = '9px "Courier New", monospace';
        ctx.fillText(text, x, y);
      }

      const grid = "rgba(134,177,203,.10)";
      for (let x = -150; x <= 540; x += 20) path([[x, -90], [x, 320]], grid, null, 0.65);
      for (let y = -80; y <= 320; y += 20) path([[-150, y], [540, y]], grid, null, 0.65);
      for (let x = 10; x <= 390; x += 80) {
        for (let y = 20; y <= 230; y += 80) {
          path([[x - 2, y], [x + 2, y]], "#345168", null, 0.8);
          path([[x, y - 2], [x, y + 2]], "#345168", null, 0.8);
        }
      }

      // Horizontal axes project onto the work plane; z is elevation.
      const project = (u, v, z = 0) => [192 + u - v, 159 + (u + v) * .46 - z];
      const plane = (points, stroke, fill, weight) => path(points.map(p => project(...p)), stroke, fill, weight);
      const copper = "#f9a265";
      function circuit(points, color) {
        plane(points, "#1d384c", null, 4);
        plane(points, color, null, 1.4);
        const [x, y] = project(...points[points.length - 1]);
        ellipse(x, y, 3, 1.7, "#132a3f", color);
      }
      circuit([[22, 19], [54, 19], [54, -43], [78, -43]], copper);
      circuit([[21, 28], [60, 28], [60, -30], [88, -30]], "#68879b");
      circuit([[-21, 28], [-21, 66], [-65, 66], [-65, 89]], "#78a1bb");
      circuit([[-10, 31], [-10, 80], [-30, 80], [-30, 109]], copper);
      circuit([[9, 28], [9, 86], [33, 86], [33, 117]], "#63859e");

      function plate(a, b, bottom, high, colors, edge) {
        const z = bottom + high;
        plane([[-a,b,z],[a,b,z],[a,b,bottom],[-a,b,bottom]], edge, colors[0]);
        plane([[a,b,z],[a,-b,z],[a,-b,bottom],[a,b,bottom]], edge, colors[1]);
        plane([[-a,-b,z],[a,-b,z],[a,b,z],[-a,b,z]], edge, colors[2]);
      }
      plate(46, 40, 0, 4, ["#243e53", "#1a3145", "#324d63"], "#6c889e");
      plane([[-43,-37,4],[43,-37,4],[43,37,4],[-43,37,4],[-43,-37,4]], "#8ba2b1", null, .6);
      for (const a of [-40,40]) for (const b of [-34,34]) {
        const [x,y] = project(a,b,5);
        ellipse(x,y,1.6,.8,"#b1c4d1");
      }
      for (const bottom of [11, 37, 63]) {
        plate(27, 24, bottom - 7, 7, ["#1a2c3d","#142739","#344f65"], "#547085");
        plate(36, 31, bottom, 16, ["#3f6077","#2b455d","#6e899d"], "#b2c8d6");
        const z = bottom + 8;
        plane([[-33,31,z-5],[31,31,z-5]], "#2e485b", null, 1);
        for (let u = -29; u <= -9; u += 3.5) {
          plane([[u,31,z+3],[u,31,z-1.7]], "#182d40", null, 1.7);
        }
        for (let u = 14; u < 28; u += 5) {
          plane([[u,31,z+1],[u+1.8,31,z+1],[u+1.8,31,z-1.1],[u,31,z-1.1]], null, copper);
        }
        for (let v = -23; v < 18; v += 5) {
          plane([[36,v,z+3],[36,v,z-2.8]], "#182f42", null, 1.4);
        }
        const t = bottom + 16;
        plane([[-31,-26,t],[31,-26,t],[31,26,t],[-31,26,t],[-31,-26,t]], "#405b6f", null, .85);
      }
      for (let v = -9; v <= 14; v += 4) {
        plane([[-13,v,79],[11,v,79]], "#365165", null, 1.5);
      }
      plane([[-22,-23,79],[-10,-23,79]], copper, null, 2.1);

      // A cylindrical data store shares the same plane and line weight as the rack.
      const dbX = 309, dbY = 159;
      ellipse(dbX, dbY + 3, 25, 11, "#20384d", "#64829a");
      for (const dy of [0, -10, -20]) {
        ellipse(dbX, dbY + dy, 20, 8, "#37566c", "#acc3d0");
        ctx.fillStyle = "#3d5b70";
        ctx.fillRect(dbX - 20, dbY + dy - 8, 40, 8);
        path([[dbX-20,dbY+dy],[dbX-20,dbY+dy-8]], "#a6bccb");
        path([[dbX+20,dbY+dy],[dbX+20,dbY+dy-8]], "#a6bccb");
        ellipse(dbX, dbY + dy - 8, 20, 8, "#708b9d", "#b2c8d6");
        path([[dbX-12,dbY+dy+1],[dbX-10,dbY+dy+2]], copper, null, 1.6);
      }
      ellipse(dbX, dbY - 28, 14, 4.8, "#6d889a", "#49677e");
      path([[225,62],[250,42],[271,42]], "#7793a8", null, .85);
      ellipse(225,62,1.7,1.7,copper);
      label("CLUSTER", 276, 45);
      path([[319,167],[334,183],[354,183]], "#7793a8", null, .85);
      label("DB", 360, 186);
    }

    draw();
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(draw);
      observer.observe(canvas);
    }
  }
  document.addEventListener("stackquest:render", mount);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
