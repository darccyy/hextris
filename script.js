const canvas = document.createElement("canvas");
canvas.width = 512;
canvas.height = 512;
const ctx = canvas.getContext("2d");
document.getElementById("contain").append(canvas);
F.createListeners();

// Global variables
var cam = { x: 0, y: 0, z: 1 },
  map,
  falling,
  lastFall,
  lastLeft,
  lastRight;

// Constants
const tileHeight = 20,
  baseSize = 40,
  maxTiles = 8,
  colors = ["#444", "red", "lime", "blue", "yellow"],
  fallInterval = 1000,
  fallSpeed = 1,
  spawnHeight = 2,
  holdSpinTimeout = 500;

function reset() {
  map = new Array(6).fill(null).map(i => new Array(maxTiles).fill(0));
  // map[0] = [1, 2, 3, 0, 1, 2];
  // map[1] = [6, 1, 3, 0, 0, 0, 0];
  // map[2] = [3, 1, 3, 0, 0, 0, 0];
  // map[3] = [4, 1, 3, 0, 0, 0, 0];
  // map[4] = [1, 1, 3, 0, 0, 0, 0];
  // map[5] = [2, 1, 3, 0, 0, 0, 0];

  falling = new Array(6).fill(null).map(i => []);
  falling[0] = [[1, 0 * maxTiles]];
  falling[1] = [
    [2, 0 * maxTiles],
    [2, 0.5 * maxTiles],
    [3, 1 * maxTiles - 1],
  ];
  falling[2] = [[3, 1 * maxTiles - 1]];
  falling[3] = [
    [4, 1 * maxTiles - 1],
    [3, 0.5 * maxTiles],
  ];
  falling[4] = [[1, 0.125 * maxTiles]];
  falling[5] = [[2, 0.25 * maxTiles]];

  lastFall = Date.now();
}

function render() {
  // Reset canvas
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Adjust for camera, realign to center
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x, -cam.y);

  // Base
  ctx.fillStyle = colors[0];
  const base = getTriangle(baseSize);
  ctx.beginPath();
  ctx.moveTo(-base.b, -base.a);
  ctx.lineTo(base.b, -base.a);
  ctx.lineTo(base.c, 0);
  ctx.lineTo(base.b, base.a);
  ctx.lineTo(-base.b, base.a);
  ctx.lineTo(-base.c, 0);
  ctx.closePath();
  ctx.fill();

  // Max height
  ctx.strokeStyle = colors[0];
  ctx.lineWidth = 2;
  const max = getTriangle(baseSize + maxTiles * tileHeight);
  ctx.beginPath();
  ctx.moveTo(-max.b, -max.a);
  ctx.lineTo(max.b, -max.a);
  ctx.lineTo(max.c, 0);
  ctx.lineTo(max.b, max.a);
  ctx.lineTo(-max.b, max.a);
  ctx.lineTo(-max.c, 0);
  ctx.closePath();
  ctx.stroke();

  // Tiles
  for (var i = 0; i < map.length; i++) {
    for (var j = 0; j < map[i].length; j++) {
      var color = map[i][j];
      if (!(0 < color && color <= colors.length)) {
        continue;
      }

      ctx.fillStyle = colors[color];
      ctx.strokeStyle = ctx.fillStyle; // Fill gap
      ctx.lineJoin = "round";
      ctx.lineWidth = 0.5;

      ctx.save();
      ctx.rotate((i / 6 + 0.5) * Math.PI * 2); // Rotate around base

      const bottom = getTriangle(baseSize + j * tileHeight),
        top = getTriangle(baseSize + (j + 1) * tileHeight);

      ctx.beginPath();
      ctx.moveTo(-bottom.b, bottom.a);
      ctx.lineTo(bottom.b, bottom.a);
      ctx.lineTo(top.b, top.a);
      ctx.lineTo(-top.b, top.a);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore(); // Revert rotate
    }
  }

  // Falling tiles
  for (var i = 0; i < falling.length; i++) {
    for (var j = 0; j < falling[i].length; j++) {
      var color = falling[i][j][0];
      if (!(0 < color && color <= colors.length)) {
        continue;
      }

      ctx.fillStyle = colors[color];
      ctx.strokeStyle = "black"; // Fill gap
      ctx.lineWidth = 2;

      ctx.save();
      ctx.rotate((i / 6 + 0.5) * Math.PI * 2); // Rotate around base

      const height = baseSize + falling[i][j][1] * tileHeight,
        bottom = getTriangle(height),
        top = getTriangle(height + tileHeight);

      ctx.beginPath();
      ctx.moveTo(-bottom.b, bottom.a);
      ctx.lineTo(bottom.b, bottom.a);
      ctx.lineTo(top.b, top.a);
      ctx.lineTo(-top.b, top.a);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore(); // Revert rotate
    }
  }

  ctx.restore(); // Revert camera, realign
}

function update(mod) {
  if (F.keys.r) {
    reset();
  }

  // Camera
  var camSpeed = 1000 * mod;
  if (F.keys.ArrowLeft ^ F.keys.ArrowRight) {
    cam.x += camSpeed * (F.keys.ArrowLeft ? -1 : 1);
  }
  if (F.keys.ArrowUp ^ F.keys.ArrowDown) {
    cam.y += camSpeed * (F.keys.ArrowUp ? -1 : 1);
  }
  if (F.keys.Minus ^ F.keys.Equal) {
    cam.z *= F.keys.Minus ? 1 / 1.1 : 1.1;
  }
  cam.z = F.border(cam.z, 0.1, 100);
  if (F.keys.Digit0) {
    cam.x = 0;
    cam.y = 0;
    cam.z = 1;
  }

  // Spin map
  if (F.keys.a) {
    if (!F.keys.d) {
      if (Date.now() - lastLeft > holdSpinTimeout) {
        lastLeft = Date.now();
        map = [...map.slice(1), map[0]];
      }
    }
  } else {
    lastLeft = 0;
  }
  if (F.keys.d) {
    if (!F.keys.a) {
      if (Date.now() - lastRight > holdSpinTimeout) {
        lastRight = Date.now();
        map = [map[map.length - 1], ...map.slice(0, -1)];
      }
    }
  } else {
    lastRight = 0;
  }

  // New falling tile
  //TODO Add speed increase
  if (Date.now() - lastFall > fallInterval) {
    lastFall = Date.now();

    falling[F.randomInt(0, 6, true)].push([
      F.randomInt(1, 5, true),
      maxTiles + spawnHeight,
    ]);
  }

  // Drop falling tiles
  for (var i in falling) {
    for (var j in falling[i]) {
      var tile = falling[i][j];
      tile[1] -= mod * fallSpeed;

      var height = Math.ceil(tile[1]);
      if (height <= 0 || map[i][height - 1]) {
        map[i][Math.ceil(tile[1])] = falling[i].shift()[0];
      }
    }
  }
}

function main() {
  render();
  update((Date.now() - then) / 1000);
  then = Date.now();
  requestAnimationFrame(main);
}
var then = Date.now();
reset();
main();

// Get triangle dimensions for shapes
function getTriangle(size) {
  return {
    a: (size * Math.sqrt(3)) / 2,
    b: size / 2,
    c: size,
  };
}
