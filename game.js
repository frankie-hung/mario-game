const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameRunning = true;
let score = 0;
let coinsCollected = 0;
let lives = 3;
let cameraX = 0;

// Mario states
const MARIO_SMALL = 0;
const MARIO_BIG = 1;
const MARIO_FIRE = 2;

// Mario
const mario = {
  x: 50,
  y: 300,
  width: 32,
  height: 40,
  vx: 0,
  vy: 0,
  speed: 5,
  jumpPower: -14,
  onGround: false,
  facing: 1,
  frame: 0,
  frameTimer: 0,
  invincible: 0,
  state: MARIO_SMALL,
  starPower: 0,
  transforming: 0,
};

// Physics
const gravity = 0.6;
const friction = 0.8;

// Level design with question blocks that have contents - REVISED MAP
const platforms = [
  // Ground
  { x: 0, y: 360, width: 500, height: 40, type: 'ground' },
  { x: 550, y: 360, width: 300, height: 40, type: 'ground' },
  { x: 900, y: 360, width: 400, height: 40, type: 'ground' },
  { x: 1350, y: 360, width: 600, height: 40, type: 'ground' },
  // Floating platforms
  { x: 200, y: 280, width: 100, height: 20, type: 'brick' },
  { x: 350, y: 220, width: 80, height: 20, type: 'brick' },
  // Question blocks - moved away from gaps
  {
    x: 250,
    y: 180,
    width: 60,
    height: 20,
    type: 'question',
    used: false,
    content: 'mushroom',
  },
  { x: 650, y: 200, width: 120, height: 20, type: 'brick' },
  {
    x: 700,
    y: 120,
    width: 60,
    height: 20,
    type: 'question',
    used: false,
    content: 'flower',
  },
  { x: 850, y: 260, width: 80, height: 20, type: 'brick' },
  {
    x: 950,
    y: 180,
    width: 60,
    height: 20,
    type: 'question',
    used: false,
    content: 'star',
  },
  { x: 1150, y: 280, width: 80, height: 20, type: 'brick' },
  { x: 1300, y: 220, width: 100, height: 20, type: 'brick' },
  { x: 1450, y: 160, width: 120, height: 20, type: 'brick' },
  // Pipes
  { x: 400, y: 310, width: 50, height: 50, type: 'pipe' },
  { x: 1100, y: 290, width: 50, height: 70, type: 'pipe' },
  // Flag
  { x: 1850, y: 160, width: 10, height: 200, type: 'flag' },
];

// Power-ups
let powerUps = [];

// Fireballs
let fireballs = [];

// Coins
let coins = [
  { x: 220, y: 240, collected: false },
  { x: 250, y: 240, collected: false },
  { x: 370, y: 180, collected: false },
  { x: 270, y: 140, collected: false },
  { x: 680, y: 160, collected: false },
  { x: 720, y: 160, collected: false },
  { x: 720, y: 80, collected: false },
  { x: 870, y: 220, collected: false },
  { x: 970, y: 140, collected: false },
  { x: 1170, y: 240, collected: false },
  { x: 1330, y: 180, collected: false },
  { x: 1470, y: 120, collected: false },
  { x: 1500, y: 120, collected: false },
];

// Enemies
let enemies = [
  { x: 300, y: 330, width: 32, height: 30, vx: -1, type: 'goomba', alive: true },
  { x: 600, y: 330, width: 32, height: 30, vx: -1, type: 'goomba', alive: true },
  { x: 950, y: 330, width: 32, height: 30, vx: 1, type: 'goomba', alive: true },
  { x: 1200, y: 330, width: 32, height: 30, vx: -1, type: 'goomba', alive: true },
  { x: 1450, y: 330, width: 32, height: 30, vx: 1, type: 'goomba', alive: true },
  { x: 1600, y: 330, width: 32, height: 30, vx: -1, type: 'goomba', alive: true },
];

// Clouds
const clouds = [
  { x: 100, y: 50, size: 40 },
  { x: 300, y: 80, size: 50 },
  { x: 550, y: 40, size: 35 },
  { x: 800, y: 70, size: 45 },
  { x: 1100, y: 50, size: 40 },
  { x: 1400, y: 80, size: 50 },
  { x: 1700, y: 45, size: 38 },
];

// Input
const keys = {};
let lastFireTime = 0;

document.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyX'].includes(e.code)) {
    e.preventDefault();
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Update Mario size based on power state
function updateMarioSize() {
  if (mario.state === MARIO_SMALL) {
    mario.height = 40;
  } else {
    mario.height = 60;
  }
}

// Create power-up
function createPowerUp(x, y, type) {
  powerUps.push({
    x,
    y,
    width: 30,
    height: 30,
    type,
    vy: -8,
    vx: 2,
    onGround: false,
  });
}

// Create fireball
function shootFireball() {
  if (mario.state === MARIO_FIRE && Date.now() - lastFireTime > 300) {
    fireballs.push({
      x: mario.x + (mario.facing > 0 ? mario.width : 0),
      y: mario.y + mario.height / 2,
      width: 12,
      height: 12,
      vx: mario.facing * 8,
      vy: 0,
      bounces: 0,
    });
    lastFireTime = Date.now();
  }
}

// Draw functions
function drawMario() {
  ctx.save();
  const screenX = mario.x - cameraX;

  // Flashing effect
  if (
    (mario.invincible > 0 || mario.transforming > 0) &&
    Math.floor((mario.invincible || mario.transforming) / 5) % 2 === 0
  ) {
    ctx.globalAlpha = 0.5;
  }

  // Star power rainbow effect
  if (mario.starPower > 0) {
    const colors = ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0077ff', '#7700ff'];
    const colorIndex = Math.floor(Date.now() / 100) % colors.length;
    ctx.filter = `hue-rotate(${colorIndex * 60}deg) brightness(1.2)`;
  }

  ctx.translate(screenX + mario.width / 2, mario.y);
  ctx.scale(mario.facing, 1);

  const heightScale = mario.state === MARIO_SMALL ? 1 : 1.5;

  // Body
  ctx.fillStyle = mario.state === MARIO_FIRE ? '#fff' : '#e52521';
  ctx.fillRect(-12, 10 * heightScale, 24, 20 * heightScale);

  // Head (skin)
  ctx.fillStyle = '#ffd8a8';
  ctx.fillRect(-10, -5, 20, 18);

  // Hat
  ctx.fillStyle = mario.state === MARIO_FIRE ? '#fff' : '#e52521';
  ctx.fillRect(-12, -10, 24, 8);
  ctx.fillRect(-8, -15, 16, 6);

  // Hat brim
  ctx.fillRect(-14, -5, 28, 4);

  // Eyes
  ctx.fillStyle = '#000';
  ctx.fillRect(2, 0, 4, 4);

  // Mustache
  ctx.fillStyle = '#4a2c00';
  ctx.fillRect(-2, 8, 12, 4);

  // Overalls (blue)
  ctx.fillStyle = '#049cd8';
  ctx.fillRect(-10, 18 * heightScale, 20, 12 * heightScale);

  // Buttons
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(-4, 22 * heightScale, 3, 3);
  ctx.fillRect(1, 22 * heightScale, 3, 3);

  // Legs
  ctx.fillStyle = '#049cd8';
  if (!mario.onGround || Math.abs(mario.vx) > 0.5) {
    // Walking animation
    const legOffset = Math.sin(mario.frame * 0.5) * 4;
    ctx.fillRect(-10, 30 * heightScale, 8, 10 + legOffset);
    ctx.fillRect(2, 30 * heightScale, 8, 10 - legOffset);
  } else {
    ctx.fillRect(-10, 30 * heightScale, 8, 10);
    ctx.fillRect(2, 30 * heightScale, 8, 10);
  }

  // Shoes (brown)
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(-12, 38 + (heightScale - 1) * 20, 10, 6);
  ctx.fillRect(2, 38 + (heightScale - 1) * 20, 10, 6);

  ctx.restore();
}

function drawPlatform(p) {
  const screenX = p.x - cameraX;
  if (screenX > canvas.width + 50 || screenX + p.width < -50) return;

  if (p.type === 'ground') {
    // Ground with grass
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(screenX, p.y, p.width, p.height);
    ctx.fillStyle = '#228b22';
    ctx.fillRect(screenX, p.y, p.width, 8);
  } else if (p.type === 'brick') {
    ctx.fillStyle = '#c84c0c';
    for (let i = 0; i < p.width; i += 20) {
      ctx.fillRect(screenX + i, p.y, 18, p.height);
      ctx.strokeStyle = '#8b2500';
      ctx.strokeRect(screenX + i, p.y, 18, p.height);
    }
  } else if (p.type === 'question') {
    ctx.fillStyle = p.used ? '#8b4513' : '#ffd700';
    ctx.fillRect(screenX, p.y, p.width, p.height);
    ctx.strokeStyle = p.used ? '#654321' : '#b8860b';
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX, p.y, p.width, p.height);
    if (!p.used) {
      ctx.fillStyle = '#8b4513';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('?', screenX + p.width / 2 - 5, p.y + 15);
    }
  } else if (p.type === 'pipe') {
    ctx.fillStyle = '#228b22';
    ctx.fillRect(screenX, p.y, p.width, p.height);
    ctx.fillStyle = '#32cd32';
    ctx.fillRect(screenX - 5, p.y, p.width + 10, 15);
    ctx.fillRect(screenX + 5, p.y, 10, p.height);
  } else if (p.type === 'flag') {
    ctx.fillStyle = '#228b22';
    ctx.fillRect(screenX, p.y, p.width, p.height);
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(screenX + p.width, p.y);
    ctx.lineTo(screenX + p.width + 40, p.y + 25);
    ctx.lineTo(screenX + p.width, p.y + 50);
    ctx.fill();
  }
}

function drawPowerUp(p) {
  const screenX = p.x - cameraX;
  if (screenX > canvas.width + 30 || screenX < -30) return;

  if (p.type === 'mushroom') {
    // Mushroom cap
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(screenX + 15, p.y + 10, 12, Math.PI, 0);
    ctx.fill();

    // White spots
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(screenX + 8, p.y + 8, 3, 0, Math.PI * 2);
    ctx.arc(screenX + 22, p.y + 8, 3, 0, Math.PI * 2);
    ctx.arc(screenX + 15, p.y + 3, 2, 0, Math.PI * 2);
    ctx.fill();

    // Stem
    ctx.fillStyle = '#f0e68c';
    ctx.fillRect(screenX + 10, p.y + 10, 10, 15);
  } else if (p.type === 'flower') {
    // Stem
    ctx.fillStyle = '#228b22';
    ctx.fillRect(screenX + 13, p.y + 15, 4, 15);

    // Petals
    ctx.fillStyle = '#ff6347';
    for (let i = 0; i < 5; i++) {
      const angle = ((i * 72 - 90) * Math.PI) / 180;
      ctx.beginPath();
      ctx.ellipse(
        screenX + 15 + Math.cos(angle) * 8,
        p.y + 12 + Math.sin(angle) * 8,
        6,
        3,
        angle,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Center
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(screenX + 15, p.y + 12, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.type === 'star') {
    // Animated star
    const pulse = Math.sin(Date.now() / 100) * 0.1 + 1;
    ctx.save();
    ctx.translate(screenX + 15, p.y + 15);
    ctx.scale(pulse, pulse);

    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = ((i * 72 - 90) * Math.PI) / 180;
      const nextAngle = (((i + 1) * 72 - 90) * Math.PI) / 180;
      const midAngle = (angle + nextAngle) / 2;

      if (i === 0) {
        ctx.moveTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
      }
      ctx.lineTo(Math.cos(midAngle) * 7, Math.sin(midAngle) * 7);
      ctx.lineTo(Math.cos(nextAngle) * 15, Math.sin(nextAngle) * 15);
    }
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(-5, -2, 3, 4);
    ctx.fillRect(2, -2, 3, 4);

    ctx.restore();
  }
}

function drawFireball(f) {
  const screenX = f.x - cameraX;
  if (screenX > canvas.width + 20 || screenX < -20) return;

  // Animated fireball
  const flicker = Math.sin(Date.now() / 50) * 0.2 + 0.8;

  ctx.save();
  ctx.globalAlpha = flicker;

  // Outer glow
  ctx.fillStyle = '#ffa500';
  ctx.beginPath();
  ctx.arc(screenX + 6, f.y + 6, 8, 0, Math.PI * 2);
  ctx.fill();

  // Inner core
  ctx.fillStyle = '#ff4500';
  ctx.beginPath();
  ctx.arc(screenX + 6, f.y + 6, 5, 0, Math.PI * 2);
  ctx.fill();

  // Hot center
  ctx.fillStyle = '#ffff00';
  ctx.beginPath();
  ctx.arc(screenX + 6, f.y + 6, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCoin(c) {
  if (c.collected) return;
  const screenX = c.x - cameraX;
  if (screenX > canvas.width + 20 || screenX < -20) return;

  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.ellipse(screenX, c.y, 10, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#daa520';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#daa520';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('$', screenX - 4, c.y + 4);
}

function drawEnemy(e) {
  if (!e.alive) return;
  const screenX = e.x - cameraX;
  if (screenX > canvas.width + 50 || screenX < -50) return;

  // Body (brown)
  ctx.fillStyle = '#8b4513';
  ctx.beginPath();
  ctx.ellipse(screenX + e.width / 2, e.y + 15, 16, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#d2691e';
  ctx.beginPath();
  ctx.ellipse(screenX + e.width / 2, e.y + 5, 14, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(screenX + e.width / 2 - 6, e.y + 3, 5, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(screenX + e.width / 2 + 6, e.y + 3, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pupils
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(screenX + e.width / 2 - 5, e.y + 4, 2, 0, Math.PI * 2);
  ctx.arc(screenX + e.width / 2 + 7, e.y + 4, 2, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrows (angry)
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(screenX + e.width / 2 - 10, e.y - 4);
  ctx.lineTo(screenX + e.width / 2 - 2, e.y - 2);
  ctx.moveTo(screenX + e.width / 2 + 10, e.y - 4);
  ctx.lineTo(screenX + e.width / 2 + 2, e.y - 2);
  ctx.stroke();

  // Feet
  ctx.fillStyle = '#000';
  const footOffset = Math.sin(Date.now() / 100) * 2;
  ctx.fillRect(screenX + 2, e.y + 24, 10, 6 + footOffset);
  ctx.fillRect(screenX + e.width - 12, e.y + 24, 10, 6 - footOffset);
}

function drawCloud(c) {
  const screenX = c.x - cameraX * 0.3; // Parallax
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(screenX, c.y, c.size * 0.6, 0, Math.PI * 2);
  ctx.arc(screenX + c.size * 0.5, c.y - c.size * 0.2, c.size * 0.5, 0, Math.PI * 2);
  ctx.arc(screenX + c.size, c.y, c.size * 0.6, 0, Math.PI * 2);
  ctx.arc(screenX + c.size * 0.5, c.y + c.size * 0.1, c.size * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawBackground() {
  // Sky gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#5c94fc');
  gradient.addColorStop(0.7, '#87ceeb');
  gradient.addColorStop(1, '#5c94fc');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Clouds
  clouds.forEach(drawCloud);

  // Hills in background
  ctx.fillStyle = '#228b22';
  for (let i = -1; i < 5; i++) {
    const hillX = i * 500 - (cameraX * 0.2) % 500;
    ctx.beginPath();
    ctx.moveTo(hillX, 360);
    ctx.quadraticCurveTo(hillX + 100, 280, hillX + 200, 360);
    ctx.fill();
  }
}

// Collision detection
function checkCollision(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

// Update game
function update() {
  if (!gameRunning) return;

  // Update power status display
  let status = '';
  if (mario.state === MARIO_FIRE) status += '🔥 Fire Power! ';
  if (mario.starPower > 0) status += '⭐ Star Power! ';
  if (mario.transforming > 0) status += '✨ Transforming... ';
  document.getElementById('powerStatus').textContent = status;

  // Input handling
  if (keys['ArrowLeft'] || keys['KeyA']) {
    mario.vx = mario.starPower > 0 ? -mario.speed * 1.5 : -mario.speed;
    mario.facing = -1;
  } else if (keys['ArrowRight'] || keys['KeyD']) {
    mario.vx = mario.starPower > 0 ? mario.speed * 1.5 : mario.speed;
    mario.facing = 1;
  } else {
    mario.vx *= friction;
  }

  if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && mario.onGround) {
    mario.vy = mario.starPower > 0 ? mario.jumpPower * 1.2 : mario.jumpPower;
    mario.onGround = false;
  }

  if (keys['KeyX']) {
    shootFireball();
  }

  // Apply gravity
  mario.vy += gravity;

  // Update position
  mario.x += mario.vx;
  mario.y += mario.vy;

  // Animation
  if (Math.abs(mario.vx) > 0.5) {
    mario.frameTimer++;
    if (mario.frameTimer > 5) {
      mario.frame++;
      mario.frameTimer = 0;
    }
  }

  // Timer updates
  if (mario.invincible > 0) mario.invincible--;
  if (mario.starPower > 0) mario.starPower--;
  if (mario.transforming > 0) mario.transforming--;

  // Platform collision
  mario.onGround = false;
  platforms.forEach((p) => {
    if (p.type === 'flag') {
      if (checkCollision(mario, { x: p.x, y: p.y, width: 50, height: p.height })) {
        winGame();
      }
      return;
    }

    if (checkCollision(mario, p)) {
      // Check from which side
      const overlapLeft = mario.x + mario.width - p.x;
      const overlapRight = p.x + p.width - mario.x;
      const overlapTop = mario.y + mario.height - p.y;
      const overlapBottom = p.y + p.height - mario.y;

      const minOverlapX = Math.min(overlapLeft, overlapRight);
      const minOverlapY = Math.min(overlapTop, overlapBottom);

      if (minOverlapY < minOverlapX) {
        if (overlapTop < overlapBottom) {
          mario.y = p.y - mario.height;
          mario.vy = 0;
          mario.onGround = true;
        } else {
          // Hit from below
          mario.y = p.y + p.height;
          mario.vy = 0;

          // Check if it's a question block
          if (p.type === 'question' && !p.used) {
            p.used = true;
            createPowerUp(p.x + p.width / 2 - 15, p.y - 40, p.content);
            score += 200;
            document.getElementById('score').textContent = score;
          }
        }
      } else {
        if (overlapLeft < overlapRight) {
          mario.x = p.x - mario.width;
        } else {
          mario.x = p.x + p.width;
        }
        mario.vx = 0;
      }
    }
  });

  // Power-up update and collision
  powerUps = powerUps.filter((p) => {
    p.vy += gravity * 0.8;
    p.y += p.vy;

    // Platform collision for power-ups
    platforms.forEach((plat) => {
      if (
        p.y + p.height >= plat.y &&
        p.y < plat.y + plat.height &&
        p.x + p.width > plat.x &&
        p.x < plat.x + plat.width
      ) {
        if (p.vy > 0) {
          p.y = plat.y - p.height;
          p.vy = 0;
          p.onGround = true;
        }
      }
    });

    // Move horizontally if on ground
    if (p.onGround) {
      p.x += p.vx;

      // Reverse direction at platform edges
      let stillOnPlatform = false;
      platforms.forEach((plat) => {
        if (
          p.x + p.width > plat.x &&
          p.x < plat.x + plat.width &&
          p.y + p.height >= plat.y &&
          p.y + p.height <= plat.y + 10
        ) {
          stillOnPlatform = true;
        }
      });
      if (!stillOnPlatform) p.vx *= -1;
    }

    // Mario collision with power-up
    if (checkCollision(mario, p)) {
      if (p.type === 'mushroom' && mario.state === MARIO_SMALL) {
        mario.state = MARIO_BIG;
        mario.transforming = 30;
        updateMarioSize();
        mario.y -= 20; // Adjust position for size change
        score += 1000;
      } else if (p.type === 'flower') {
        if (mario.state === MARIO_SMALL) {
          mario.state = MARIO_BIG;
          updateMarioSize();
          mario.y -= 20;
        }
        mario.state = MARIO_FIRE;
        mario.transforming = 30;
        score += 1000;
      } else if (p.type === 'star') {
        mario.starPower = 600; // 10 seconds of star power
        mario.invincible = 600;
        score += 1000;
      }
      document.getElementById('score').textContent = score;
      return false; // Remove collected power-up
    }

    // Remove if fallen off screen
    return p.y < canvas.height + 50;
  });

  // Fireball update
  fireballs = fireballs.filter((f) => {
    f.x += f.vx;
    f.vy += gravity * 0.5;
    f.y += f.vy;

    // Bounce on platforms
    platforms.forEach((p) => {
      if (
        f.y + f.height >= p.y &&
        f.y < p.y + p.height &&
        f.x + f.width > p.x &&
        f.x < p.x + p.width &&
        f.vy > 0
      ) {
        f.y = p.y - f.height;
        f.vy = -6;
        f.bounces++;
      }
    });

    // Enemy collision
    enemies.forEach((e) => {
      if (e.alive && checkCollision(f, e)) {
        e.alive = false;
        score += 200;
        document.getElementById('score').textContent = score;
      }
    });

    // Remove if bounced too many times or off screen
    return (
      f.bounces < 3 &&
      f.x > cameraX - 50 &&
      f.x < cameraX + canvas.width + 50 &&
      f.y < canvas.height
    );
  });

  // Coin collection
  coins.forEach((c) => {
    if (
      !c.collected &&
      Math.abs(mario.x + mario.width / 2 - c.x) < 25 &&
      Math.abs(mario.y + mario.height / 2 - c.y) < 25
    ) {
      c.collected = true;
      coinsCollected++;
      score += 100;
      document.getElementById('coins').textContent = coinsCollected;
      document.getElementById('score').textContent = score;
    }
  });

  // Enemy update and collision
  enemies.forEach((e) => {
    if (!e.alive) return;

    e.x += e.vx;

    // Enemy platform collision / edges
    platforms.forEach((p) => {
      if (
        e.x + e.width > p.x &&
        e.x < p.x + p.width &&
        e.y + e.height >= p.y &&
        e.y + e.height <= p.y + 10
      ) {
        // on platform
      }
      // Bounce off walls
      if (e.x <= p.x && e.x + e.width >= p.x && e.vx > 0) e.vx *= -1;
      if (e.x + e.width >= p.x + p.width && e.x <= p.x + p.width && e.vx < 0) e.vx *= -1;
    });

    // Reverse at edges
    if (e.x < 0 || e.x > 1900) e.vx *= -1;

    // Mario collision with enemy
    if (checkCollision(mario, e)) {
      if (mario.starPower > 0) {
        // Star power defeats enemies on contact
        e.alive = false;
        score += 200;
        document.getElementById('score').textContent = score;
      } else if (mario.invincible <= 0) {
        if (mario.vy > 0 && mario.y + mario.height < e.y + e.height / 2) {
          // Stomp enemy
          e.alive = false;
          mario.vy = -10;
          score += 200;
          document.getElementById('score').textContent = score;
        } else {
          // Take damage
          if (mario.state !== MARIO_SMALL) {
            mario.state = MARIO_SMALL;
            mario.transforming = 60;
            mario.invincible = 120;
            updateMarioSize();
            mario.vy = -8;
            mario.vx = mario.facing * -5;
          } else {
            lives--;
            document.getElementById('lives').textContent = lives;
            mario.invincible = 120;
            mario.vy = -8;
            mario.vx = mario.facing * -5;

            if (lives <= 0) {
              gameOver();
            }
          }
        }
      }
    }
  });

  // Fall off screen
  if (mario.y > canvas.height + 50) {
    lives--;
    document.getElementById('lives').textContent = lives;
    if (lives <= 0) {
      gameOver();
    } else {
      mario.x = 50;
      mario.y = 300;
      mario.vx = 0;
      mario.vy = 0;
      mario.state = MARIO_SMALL;
      mario.starPower = 0;
      mario.transforming = 0;
      updateMarioSize();
      cameraX = 0;
    }
  }

  // Boundary
  if (mario.x < 0) mario.x = 0;

  // Camera follow
  const targetCameraX = mario.x - canvas.width / 3;
  cameraX += (targetCameraX - cameraX) * 0.1;
  if (cameraX < 0) cameraX = 0;
  if (cameraX > 1200) cameraX = 1200;
}

function gameOver() {
  gameRunning = false;
  document.getElementById('finalScore').textContent = score;
  document.getElementById('gameOver').style.display = 'block';
}

function winGame() {
  gameRunning = false;
  score += 1000;
  document.getElementById('winScore').textContent = score;
  document.getElementById('winScreen').style.display = 'block';
}

function restartGame() {
  mario.x = 50;
  mario.y = 300;
  mario.vx = 0;
  mario.vy = 0;
  mario.invincible = 0;
  mario.starPower = 0;
  mario.transforming = 0;
  mario.state = MARIO_SMALL;
  updateMarioSize();
  cameraX = 0;
  score = 0;
  coinsCollected = 0;
  lives = 3;
  gameRunning = true;
  powerUps = [];
  fireballs = [];

  // Reset platforms
  platforms.forEach((p) => {
    if (p.type === 'question') {
      p.used = false;
    }
  });

  coins.forEach((c) => {
    c.collected = false;
  });
  enemies = [
    { x: 300, y: 330, width: 32, height: 30, vx: -1, type: 'goomba', alive: true },
    { x: 600, y: 330, width: 32, height: 30, vx: -1, type: 'goomba', alive: true },
    { x: 950, y: 330, width: 32, height: 30, vx: 1, type: 'goomba', alive: true },
    { x: 1200, y: 330, width: 32, height: 30, vx: -1, type: 'goomba', alive: true },
    { x: 1450, y: 330, width: 32, height: 30, vx: 1, type: 'goomba', alive: true },
    { x: 1600, y: 330, width: 32, height: 30, vx: -1, type: 'goomba', alive: true },
  ];

  document.getElementById('score').textContent = score;
  document.getElementById('coins').textContent = coinsCollected;
  document.getElementById('lives').textContent = lives;
  document.getElementById('gameOver').style.display = 'none';
  document.getElementById('winScreen').style.display = 'none';
}

// Main game loop
function gameLoop() {
  update();

  // Draw everything
  drawBackground();
  platforms.forEach(drawPlatform);
  coins.forEach(drawCoin);
  powerUps.forEach(drawPowerUp);
  enemies.forEach(drawEnemy);
  fireballs.forEach(drawFireball);
  drawMario();

  requestAnimationFrame(gameLoop);
}

// Start game
gameLoop();

