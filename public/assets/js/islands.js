/* PocketUniversity.AI — the landmark island cards.
 *
 * Paints the Gherkin and Dymak HQ onto their <canvas class="isle"> cards:
 * the same floating voxel islands, sky and sea as the OttomanLabs.AI
 * homepage, drawn with the same fixed-pitch projector and the same models
 * (the Gherkin from the dashboard's exported settings, Dymak HQ from the
 * pyDymak OBJ). Each card is a static painting, repainted on resize;
 * data-proj on the canvas picks the model. */
(function(){
  "use strict";
  var ctx = null;

  var PROJECTS = [
    { name:'GHERKIN', draw:drawGherkin, shadow:0.34, theme:'london', foot:0.44 },
    { name:'HQ',      draw:drawDymak,   shadow:0.58, theme:'odense', foot:0.62 }
  ];
  var TAU = Math.PI * 2;

  // ---- shared 3D projection: fixed pitch, camera yaw ----
  var SB = 0.42;                          // sin(pitch) — raised for the isometric look
  var CB = Math.sqrt(1 - SB * SB);        // cos(pitch) — vertical foreshortening
  var LIGHT = -0.9;                       // light azimuth in view space
  // per-model projector: model meters → screen px (x0,gy = ground anchor)
  function mkProj(x0, gy, k, yaw){
    var ca = Math.cos(yaw), sa = Math.sin(yaw);
    return function(mx, my, mz){
      var rx = mx * ca - my * sa;
      var ry = mx * sa + my * ca;        // +ry = toward the camera
      return { x: x0 + rx * k, y: gy + (ry * SB - mz * CB) * k, d: -ry };
    };
  }
  function shade(hex, br){
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, Math.round(((n >> 16) & 255) * br));
    var g = Math.min(255, Math.round(((n >> 8) & 255) * br));
    var b = Math.min(255, Math.round((n & 255) * br));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  // painter-sorted flat-shaded faces. az = plan azimuth of the face normal
  // (null = top face, drawn a touch brighter); yaw feeds the light so faces
  // darken as the camera orbits past them.
  function paintFaces(ctx, faces, prj, yaw, lineCol){
    var out = faces.map(function(f){
      var pts = f.pts.map(function(p){ return prj(p[0], p[1], p[2]); });
      var d = 0, z = 0;
      for(var i = 0; i < pts.length; i++){ d += pts[i].d; z += f.pts[i][2]; }
      var br = (f.az == null) ? 1.1 : (0.78 + 0.26 * Math.cos(f.az + yaw - LIGHT));
      return { pts: pts, d: d / pts.length, z: z / pts.length, col: shade(f.col, br) };
    }).sort(function(a, b){ return (b.d - a.d) || (a.z - b.z); });
    out.forEach(function(f){
      ctx.beginPath();
      ctx.moveTo(f.pts[0].x, f.pts[0].y);
      for(var i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i].x, f.pts[i].y);
      ctx.closePath();
      ctx.fillStyle = f.col; ctx.fill();
      ctx.strokeStyle = lineCol || 'rgba(0,0,0,.18)'; ctx.lineWidth = 1; ctx.stroke();
    });
  }
  function rectPlan(ox, oy, dx, dy, hl, hw){                   // rect centred on (ox,oy), axis (dx,dy)
    var L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    var px = -dy, py = dx;
    return [[ox + dx*hl + px*hw, oy + dy*hl + py*hw],
            [ox - dx*hl + px*hw, oy - dy*hl + py*hw],
            [ox - dx*hl - px*hw, oy - dy*hl - py*hw],
            [ox + dx*hl - px*hw, oy + dy*hl - py*hw]];
  }

  function cloud(x, y, r){
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU); ctx.arc(x + r * 1.1, y + r * 0.18, r * 0.75, 0, TAU);
    ctx.arc(x - r * 1.05, y + r * 0.22, r * 0.65, 0, TAU); ctx.fill();
  }

  /* ---- voxel islands: each landmark floats on a chunky, Minecraft-ish
     island themed to its own city; drawn with the same projector ---- */
  function slab(faces, plan, z0, z1, col){
    var cx0 = 0, cy0 = 0;
    plan.forEach(function(p){ cx0 += p[0] / plan.length; cy0 += p[1] / plan.length; });
    for(var i = 0; i < plan.length; i++){
      var a = plan[i], b = plan[(i + 1) % plan.length];
      var nx = (b[1] - a[1]), ny = -(b[0] - a[0]);
      var mx = (a[0] + b[0]) / 2 - cx0, my = (a[1] + b[1]) / 2 - cy0;
      if(nx * mx + ny * my < 0){ nx = -nx; ny = -ny; }
      faces.push({ pts: [[a[0],a[1],z0],[b[0],b[1],z0],[b[0],b[1],z1],[a[0],a[1],z1]],
                   col: col, az: Math.atan2(nx, ny) });
    }
    faces.push({ pts: plan.map(function(p){ return [p[0], p[1], z1]; }), col: col, az: null });
  }
  function sq(ox, oy, half){ return rectPlan(ox, oy, 1, 0, half, half); }
  function voxTree(d, x, y, sc){
    d.push([x, y, 0.030 * sc, 0, 0.10 * sc, '#8B5A3C']);
    d.push([x, y, 0.085 * sc, 0.10 * sc, 0.22 * sc, '#3E8E56']);
    d.push([x, y, 0.055 * sc, 0.22 * sc, 0.30 * sc, '#57A96B']);
  }
  function voxHouse(d, x, y, wall, roof){
    d.push([x, y, 0.075, 0, 0.10, wall]);
    d.push([x, y, 0.055, 0.10, 0.16, roof]);
  }
  var THEMES = {
    london:  { top:'#7CC96F', side:'#5CA455', dirt:'#8B5A3C', dirt2:'#7A4E33', stone:'#8C9096',
               deco: function(d){ voxTree(d, -0.50, 0.30, 1); voxTree(d, 0.30, -0.50, 0.8);
                                  voxHouse(d, 0.52, 0.34, '#C86452', '#6E4A2E'); } },
    odense:  { top:'#86CF78', side:'#63AC5C', dirt:'#8B5A3C', dirt2:'#7A4E33', stone:'#8C9096',
               deco: function(d){ voxHouse(d, -0.52, 0.30, '#9C3B32', '#4A3527');
                                  voxHouse(d, 0.30, -0.52, '#B3402F', '#4A3527');
                                  voxTree(d, 0.52, 0.36, 0.85); } }
  };
  /* minecraft tiles: an 8x8 quantized-noise tile per block colour (the
     wool/grass/dirt look from the reference set), upscaled unsmoothed */
  var TILES = {};
  function texTile(ctx, col){
    if(TILES[col]) return TILES[col];
    var t = document.createElement('canvas');
    t.width = 8; t.height = 8;
    var tc = t.getContext('2d');
    var LV = [0.85, 0.93, 1, 1.09];
    for(var y = 0; y < 8; y++)
      for(var x = 0; x < 8; x++){
        var h1 = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; h1 -= Math.floor(h1);
        tc.fillStyle = shade(col, LV[Math.floor(h1 * 4) % 4]);
        tc.fillRect(x, y, 1, 1);
      }
    var big = document.createElement('canvas');
    big.width = 40; big.height = 40;
    var bc = big.getContext('2d');
    bc.imageSmoothingEnabled = false;
    bc.drawImage(t, 0, 0, 40, 40);
    TILES[col] = ctx.createPattern(big, 'repeat');
    return TILES[col];
  }
  /* island painter: stacked slabs differ in depth by noise-level amounts, so
     near-ties resolve by height (lower faces first) instead of raw depth */
  function paintVox(ctx, faces, prj, yaw, lineCol){
    var out = faces.map(function(f){
      var pts = f.pts.map(function(p){ return prj(p[0], p[1], p[2]); });
      var d = 0, z = 0;
      for(var i = 0; i < pts.length; i++){ d += pts[i].d; z += f.pts[i][2]; }
      var br = (f.az == null) ? 1.1 : (0.78 + 0.26 * Math.cos(f.az + yaw - LIGHT));
      var uv = null;
      if(f.pts.length >= 3){
        /* texel grid in the face's own planar u/v basis (~0.045 model units
           per texel, 5 pattern units per texel) — works for quads and the
           round island tops alike, and rides with the camera */
        var m = f.pts;
        var U = [m[1][0]-m[0][0], m[1][1]-m[0][1], m[1][2]-m[0][2]];
        var lu = Math.hypot(U[0], U[1], U[2]) || 1;
        U = [U[0]/lu, U[1]/lu, U[2]/lu];
        var W3 = [m[2][0]-m[0][0], m[2][1]-m[0][1], m[2][2]-m[0][2]];
        var N3 = [U[1]*W3[2]-U[2]*W3[1], U[2]*W3[0]-U[0]*W3[2], U[0]*W3[1]-U[1]*W3[0]];
        var ln = Math.hypot(N3[0], N3[1], N3[2]) || 1;
        N3 = [N3[0]/ln, N3[1]/ln, N3[2]/ln];
        var V3 = [N3[1]*U[2]-N3[2]*U[1], N3[2]*U[0]-N3[0]*U[2], N3[0]*U[1]-N3[1]*U[0]];
        var u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
        for(var mi = 0; mi < m.length; mi++){
          var du = (m[mi][0]-m[0][0])*U[0] + (m[mi][1]-m[0][1])*U[1] + (m[mi][2]-m[0][2])*U[2];
          var dvv = (m[mi][0]-m[0][0])*V3[0] + (m[mi][1]-m[0][1])*V3[1] + (m[mi][2]-m[0][2])*V3[2];
          if(du < u0) u0 = du; if(du > u1) u1 = du;
          if(dvv < v0) v0 = dvv; if(dvv > v1) v1 = dvv;
        }
        var eu = (u1 - u0) || 0.01, ev = (v1 - v0) || 0.01;
        var O = [m[0][0] + U[0]*u0 + V3[0]*v0, m[0][1] + U[1]*u0 + V3[1]*v0, m[0][2] + U[2]*u0 + V3[2]*v0];
        var pO = prj(O[0], O[1], O[2]);
        var pU = prj(O[0]+U[0]*eu, O[1]+U[1]*eu, O[2]+U[2]*eu);
        var pV = prj(O[0]+V3[0]*ev, O[1]+V3[1]*ev, O[2]+V3[2]*ev);
        var tu = Math.max(2, Math.round(eu / 0.045)) * 5;
        var tv = Math.max(2, Math.round(ev / 0.045)) * 5;
        var sux = pU.x - pO.x, suy = pU.y - pO.y, svx = pV.x - pO.x, svy = pV.y - pO.y;
        /* tiny faces skip the texel pass — flat fill reads the same and
           the per-face clip work is what lags */
        if(Math.abs(sux * svy - suy * svx) > 150)
          uv = { a: sux/tu, b: suy/tu, c: svx/tv, d: svy/tv,
                 e: pO.x, f: pO.y, w: tu, h: tv };
      }
      return { pts: pts, d: d / pts.length, z: z / pts.length, col: shade(f.col, br), base: f.col, br: br, uv: uv };
    }).sort(function(a, b){
      var dd = b.d - a.d;
      if(Math.abs(dd) > 0.06) return dd;
      return (a.z - b.z) || dd;
    });
    out.forEach(function(f, fi){
      ctx.beginPath();
      ctx.moveTo(f.pts[0].x, f.pts[0].y);
      for(var i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i].x, f.pts[i].y);
      ctx.closePath();
      ctx.fillStyle = f.col; ctx.fill();
      if(f.uv){
        var o = f.uv, ox = (fi * 3 % 8) * 5, oy = (fi * 5 % 8) * 5;
        ctx.save(); ctx.clip();
        ctx.transform(o.a, o.b, o.c, o.d, o.e, o.f);
        ctx.translate(-ox, -oy);   /* per-face tile offset so blocks don't repeat */
        ctx.fillStyle = texTile(ctx, f.base);
        ctx.fillRect(ox, oy, o.w, o.h);
        /* bake the face light onto the tile */
        if(f.br < 1){
          ctx.fillStyle = 'rgba(0,0,0,' + Math.min(0.5, (1 - f.br) * 0.85).toFixed(3) + ')';
          ctx.fillRect(ox, oy, o.w, o.h);
        } else if(f.br > 1){
          ctx.fillStyle = 'rgba(255,255,255,' + ((f.br - 1) * 0.4).toFixed(3) + ')';
          ctx.fillRect(ox, oy, o.w, o.h);
        }
        ctx.restore();
      }
      ctx.strokeStyle = lineCol || 'rgba(0,0,0,.18)'; ctx.lineWidth = 1; ctx.stroke();
    });
  }
  function circPlan(r, n){
    var p = [];
    for(var i = 0; i < n; i++){
      var a = TAU * i / n;
      p.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return p;
  }
  /* three-disc island: grass, mud, then stone — same thickness, radius
     shrinking as it goes down */
  function isleStack(faces, R, th){
    var T = 0.15;
    [ [R,        -T,     0,      th.top,   th.side],
      [R * 0.82, -2 * T, -T,     th.dirt,  th.dirt2 || th.dirt],
      [R * 0.64, -3 * T, -2 * T, th.stone, th.stone]
    ].forEach(function(q){
      slab(faces, circPlan(q[0], 22), q[1], q[2], q[4]);
      faces[faces.length - 1].col = q[3];
    });
  }
  function voxIsland(ctx, x0, gy, sc, yaw, th, foot){
    var k = sc / CB, prj = mkProj(x0, gy, k, yaw), faces = [];
    var R = Math.max(0.30, foot || 0.62);
    isleStack(faces, R, th);
    paintVox(ctx, faces, prj, yaw, 'rgba(0,0,0,.14)');
    /* the props go in a second painter pass — the big disc faces can never
       average-depth their way over a small tree again */
    var d = [], dfaces = [];
    th.deco(d);
    var ds = R / 0.62;   /* deco keeps its ring position relative to the disc */
    d.forEach(function(c){ slab(dfaces, sq(c[0] * ds, c[1] * ds, c[2]), c[3], c[4], c[5]); });
    paintVox(ctx, dfaces, prj, yaw, 'rgba(0,0,0,.14)');
  }

  /* ---- the two structures as true 3D models (yaw = camera orbit) ---- */

  // The Gherkin — built from the dashboard's exported settings JSON
  // (gherkinsettings 2026-07-06): cubic profile spline on the 600-logical
  // board, H 180 m, levels every 8 m with a 1 m top offset, 22 diagrid nodes.
  var GHERKIN = {
    H: 180, levelH: 8, topOff: 1, N: 22,
    pts: [[0, 0], [120, 0], [180, 390], [120, 600]]            // board space: y 0 = tip, 600 = base
  };
  var GK = (function(){
    var P = GHERKIN.pts, S = 64, poly = [];
    for(var i = 0; i <= S; i++){                               // degree-3, 4 points → a Bézier
      var t = i / S, u = 1 - t;
      poly.push({ x: u*u*u*P[0][0] + 3*u*u*t*P[1][0] + 3*u*t*t*P[2][0] + t*t*t*P[3][0],
                  y: u*u*u*P[0][1] + 3*u*u*t*P[1][1] + 3*u*t*t*P[2][1] + t*t*t*P[3][1] });
    }
    var zs = [], hi = GHERKIN.H - GHERKIN.topOff;
    for(var z = 0; z < hi - GHERKIN.levelH * 0.01; z += GHERKIN.levelH) zs.push(z);
    zs.push(hi);
    var rs = zs.map(function(zz){
      var yL = (1 - zz / GHERKIN.H) * 600, best = 0;
      for(var j = 0; j < poly.length - 1; j++){
        var a = poly[j], b = poly[j + 1];
        if((a.y - yL) * (b.y - yL) <= 0 && a.y !== b.y){
          var xx = a.x + (b.x - a.x) * (yL - a.y) / (b.y - a.y);
          if(xx > best) best = xx;
        }
      }
      return best / 600 * GHERKIN.H;                           // logical x → meters
    });
    return { zs: zs, rs: rs };
  })();

  function drawGherkin(ctx, x0, gy, s, yaw){
    var k = s / (GHERKIN.H * CB), prj = mkProj(x0, gy, k, yaw);
    var N = GHERKIN.N, L = GK.zs.length, i, j;
    // glass body: the silhouette of the surface of revolution (±r about the axis)
    ctx.beginPath();
    for(i = 0; i < L; i++){ var pR = prj(0, 0, GK.zs[i]); var X = pR.x + GK.rs[i] * k;
      i ? ctx.lineTo(X, pR.y) : ctx.moveTo(X, pR.y); }
    for(i = L - 1; i >= 0; i--){ var pL = prj(0, 0, GK.zs[i]); ctx.lineTo(pL.x - GK.rs[i] * k, pL.y); }
    ctx.closePath();
    var g = ctx.createLinearGradient(x0 - s * 0.3, 0, x0 + s * 0.3, 0);
    g.addColorStop(0, '#4E9E8C'); g.addColorStop(0.45, '#82CDB9'); g.addColorStop(1, '#5FAF9C');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#245E52'; ctx.lineWidth = Math.max(1.1, s * 0.012); ctx.stroke();
    // level rings — real 3D circles
    ctx.strokeStyle = 'rgba(36,94,82,.42)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for(i = 0; i < L; i++){
      var r = GK.rs[i]; if(r < 1e-3) continue;
      for(j = 0; j <= N; j++){
        var th = TAU * j / N;
        var p = prj(r * Math.cos(th), r * Math.sin(th), GK.zs[i]);
        j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      }
    }
    ctx.stroke();
    // diagrid braces: node k joins the two bracketing nodes on the level above
    ctx.strokeStyle = 'rgba(30,77,67,.75)'; ctx.lineWidth = Math.max(1, s * 0.008);
    ctx.beginPath();
    for(i = 0; i < L - 1; i++){
      var r1 = GK.rs[i], r2 = GK.rs[i + 1];
      if(r1 < 1e-3 || r2 < 1e-3) continue;
      var o1 = (i % 2) * Math.PI / N, o2 = ((i + 1) % 2) * Math.PI / N;
      var aOff = (i % 2 === 0) ? -1 : 0, bOff = (i % 2 === 0) ? 0 : 1;
      for(j = 0; j < N; j++){
        var a1 = TAU * j / N + o1;
        var lo = prj(r1 * Math.cos(a1), r1 * Math.sin(a1), GK.zs[i]);
        [aOff, bOff].forEach(function(off){
          var jj = ((j + off) % N + N) % N;
          var a2 = TAU * jj / N + o2;
          var up = prj(r2 * Math.cos(a2), r2 * Math.sin(a2), GK.zs[i + 1]);
          ctx.moveTo(lo.x, lo.y); ctx.lineTo(up.x, up.y);
        });
      }
    }
    ctx.stroke();
    // cap
    var tip = prj(0, 0, GHERKIN.H);
    ctx.fillStyle = '#DFF3EE';
    ctx.beginPath(); ctx.arc(tip.x, tip.y, Math.max(1.6, s * 0.02), 0, TAU); ctx.fill();
  }

  // Dymak HQ — round glass hall under a swirling shingled roof that dips
  // into a central open courtyard (modelled from the reference photos).
  // Proportions and rake from the exported pyDymak OBJ: R 70, hole r 25
  // offset 15 toward the low side, roof rim 35 m -> 10 m, hole rim
  // 15 m -> 25 m opposed, 36 bays. u maps metres to model units.
  function drawDymak(ctx, x0, gy, s, yaw){
    var k = s / CB, prj = mkProj(x0, gy, k, yaw);
    var u = 0.0077, Re = 70 * u, Ro = Re * 0.94, Ri = 25 * u, n = 36, faces = [], i;
    var PH = 0.8;                                              // plan angle of the roof high point
    var hw = 8 * u;                                            // glass drum, under the 10 m low rim
    var hcx = 15 * u * Math.sin(PH + Math.PI), hcy = 15 * u * Math.cos(PH + Math.PI);
    function rimO(th){ return u * (22.5 + 12.5 * Math.cos(th - PH)); }
    function rimI(th){ return u * (20.0 -  5.0 * Math.cos(th - PH)); }
    for(i = 0; i < n; i++){
      var t0 = TAU * i / n, t1 = TAU * (i + 1) / n, tm = (t0 + t1) / 2;
      var s0 = Math.sin(t0), c0 = Math.cos(t0), s1 = Math.sin(t1), c1 = Math.cos(t1);
      // glass drum, set in from the eave
      faces.push({ pts: [[Ro*s0,Ro*c0,0],[Ro*s1,Ro*c1,0],[Ro*s1,Ro*c1,hw],[Ro*s0,Ro*c0,hw]],
                   col: '#C79E6F', az: tm });
      // shingled fascia: deep on the high side, a sliver on the low side
      faces.push({ pts: [[Re*s0,Re*c0,hw],[Re*s1,Re*c1,hw],[Re*s1,Re*c1,rimO(t1)],[Re*s0,Re*c0,rimO(t0)]],
                   col: '#9C5F3E', az: tm });
      // roof: raked outer rim sweeping into the offset, counter-raked hole
      faces.push({ pts: [[Re*s0,Re*c0,rimO(t0)],[Re*s1,Re*c1,rimO(t1)],
                         [hcx+Ri*s1,hcy+Ri*c1,rimI(t1)],[hcx+Ri*s0,hcy+Ri*c0,rimI(t0)]],
                   col: '#B5734D', az: tm });
    }
    paintFaces(ctx, faces, prj, yaw, 'rgba(90,52,32,.45)');
    // radial roof seams — the far half is the visible bowl of the crater
    ctx.strokeStyle = 'rgba(90,52,32,.5)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for(i = 0; i < n; i++){
      var ts = TAU * (i + 0.5) / n;
      if(Math.cos(ts + yaw) > -0.1) continue;
      var r0 = prj(Re * Math.sin(ts), Re * Math.cos(ts), rimO(ts));
      var r1 = prj(hcx + Ri * Math.sin(ts), hcy + Ri * Math.cos(ts), rimI(ts));
      ctx.moveTo(r0.x, r0.y); ctx.lineTo(r1.x, r1.y);
    }
    ctx.stroke();
    // the raked rim edge itself
    ctx.strokeStyle = '#8A5637'; ctx.lineWidth = Math.max(1.1, s * 0.012);
    ctx.beginPath();
    for(i = 0; i <= n * 2; i++){
      var te = TAU * i / (n * 2);
      var pe = prj(Re * Math.sin(te), Re * Math.cos(te), rimO(te));
      i ? ctx.lineTo(pe.x, pe.y) : ctx.moveTo(pe.x, pe.y);
    }
    ctx.stroke();
    // mullions on the camera-facing glass
    ctx.strokeStyle = '#6E4A2E'; ctx.lineWidth = Math.max(1, s * 0.01);
    ctx.beginPath();
    for(i = 0; i < n * 2; i++){
      var tc = TAU * i / (n * 2);
      if(Math.cos(tc + yaw) < 0.2) continue;
      var m0 = prj(Ro * Math.sin(tc), Ro * Math.cos(tc), 0.01);
      var m1 = prj(Ro * Math.sin(tc), Ro * Math.cos(tc), hw - 0.01);
      ctx.moveTo(m0.x, m0.y); ctx.lineTo(m1.x, m1.y);
    }
    ctx.stroke();
  }

  /* ---- one static painting per card ---- */
  function paintProjCard(cv, p){
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = cv.clientWidth; if(w <= 0) return;
    var h = Math.round(w * 0.82);
    cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    sky.addColorStop(0, '#A9DFF0'); sky.addColorStop(1, '#E6F7FC');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h * 0.55);
    ctx.fillStyle = '#FFE9A8';
    ctx.beginPath(); ctx.arc(w * 0.84, h * 0.13, Math.min(w, h) * 0.055, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFD670';
    ctx.beginPath(); ctx.arc(w * 0.84, h * 0.13, Math.min(w, h) * 0.036, 0, TAU); ctx.fill();
    cloud(w * 0.2, h * 0.12, w * 0.05);
    cloud(w * 0.56, h * 0.07, w * 0.036);
    var sea = ctx.createLinearGradient(0, h * 0.42, 0, h);
    sea.addColorStop(0, '#2E93AC'); sea.addColorStop(1, '#57C7DD');
    ctx.fillStyle = sea; ctx.fillRect(0, h * 0.42, w, h * 0.58);
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.4; ctx.setLineDash([9, 14]);
    [0.55, 0.72, 0.9].forEach(function(f, i){
      ctx.beginPath(); ctx.moveTo(w * (i % 2 ? 0.06 : 0.02), h * f); ctx.lineTo(w * (i % 2 ? 0.96 : 0.9), h * f); ctx.stroke();
    });
    ctx.setLineDash([]);
    var YAW = 0.52, gx = w * 0.5, gy = h * 0.58, s = h * 0.32;
    ctx.fillStyle = 'rgba(10,44,62,.22)';
    ctx.beginPath(); ctx.ellipse(gx, gy + s * 0.85, s * 0.52, s * 0.075, 0, 0, TAU); ctx.fill();
    voxIsland(ctx, gx, gy, s, YAW, THEMES[p.theme] || THEMES.london, p.foot);
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    ctx.beginPath(); ctx.ellipse(gx, gy + s * 0.012, s * p.shadow, s * 0.05, 0, 0, TAU); ctx.fill();
    p.draw(ctx, gx, gy, s, YAW);
  }
  function paintAllProj(){
    var cards = document.querySelectorAll('canvas.isle');
    for(var i = 0; i < cards.length; i++){
      var p = PROJECTS[parseInt(cards[i].getAttribute('data-proj'), 10)];
      if(p) paintProjCard(cards[i], p);
    }
  }
  window.addEventListener('resize', paintAllProj);
  paintAllProj();
})();
