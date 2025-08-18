const { createCanvas } = require("canvas");
const { spawn } = require("child_process");

const width = 1080;
const height = 1920;
const canvas = createCanvas(width, height);
const context = canvas.getContext("2d");
const updates = 60 * 30;
const updatesPerFrame = 1;
const fps = 60;

const ffmpeg = spawn("ffmpeg", [
  "-y", // overwrites output.mp4 if exists
  "-f", "rawvideo",
  "-pix_fmt", "rgba",
  "-s", `${width}x${height}`,
  "-r", String(fps),
  "-i", "pipe:0",
  "-c:v", "libx264",
  "-pix_fmt", "yuv420p",
  "-loglevel", "error",
  "output.mp4"
]);

ffmpeg.stderr.on("data", (data) => {
  console.error("ffmpeg:", data.toString());
});

ffmpeg.on("close", (code) => {
  console.log("✅ FFmpeg finished with code", code);
});

class Ball {
  constructor(x, y, velocityX, velocityY) {
    this.x = x || 540;
    this.y = y || 910;
    this.velocityX = velocityX || 0;
    this.velocityY = velocityY || 0;
    this.hsl = random(360);
    this.active = true;
  }

  draw(ctx) {
    ctx.fillStyle = `hsl(${this.hsl}, 100%, 50%)`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 15, 0, 2 * Math.PI);
    ctx.fill();
    this.hsl++;
  }
}

let balls = [];
for(let i = 0; i < 100; i++) {
  const x = random(400) + 200;
  const y = random(200) + 200;
  const velocityX = (Math.random() - 0.5) * 2;
  const velocityY = (Math.random() - 0.5) * 2;
  balls.push(new Ball(x, y, velocityX, velocityY));
}

function random(max) {
  return Math.floor(Math.random() * max);
}

function distance(x1, y1, x2, y2) {
  const a = x1 - x2;
  const b = y1 - y2;
  return Math.sqrt(a*a + b*b);
}

function angleBetweenTwoPoints(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

function update() {
  balls.forEach((ball, i) => {
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;

    ball.velocityY += 0.1;

    if(ball.active && distance(540, 910, ball.x, ball.y) > 523) {
      const angle = angleBetweenTwoPoints(540, 910, ball.x, ball.y);
      // Check if ball is in the hole
      const normalizedAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const holeStart = ((holeAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const holeEnd = ((holeAngle + Math.PI * (360 - holeRadius) / 180) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

      let inHole = false;
      if (holeStart < holeEnd) {
        inHole = normalizedAngle >= holeStart && normalizedAngle <= holeEnd;
      } else {
        inHole = normalizedAngle >= holeStart || normalizedAngle <= holeEnd;
      }

      if(!inHole) {
        ball.active = false;
        balls.push(new Ball(540, 910, (random(10000) - 5000) / 1000, (random(10000) - 5000) / 1000));
        balls.push(new Ball(540, 910, (random(10000) - 5000) / 1000, (random(10000) - 5000) / 1000));
        return;
      }
      ball.x = 540 + Math.cos(angle) * 523;
      ball.y = 910 + Math.sin(angle) * 523;

      const normalVectorX = (ball.x - 540) / 523;
      const normalVectorY = (ball.y - 910) / 523;

      const velocityVectorX = ball.velocityX;
      const velocityVectorY = ball.velocityY;

      const dot = velocityVectorX * normalVectorX + velocityVectorY * normalVectorY;

      ball.velocityX = velocityVectorX - 2 * dot * normalVectorX;
      ball.velocityY = velocityVectorY - 2 * dot * normalVectorY;
    }

    if(!ball.active && ball.y > 1920 + 30) {
      balls.splice(i, 1);
    }
  });

  holeAngle += 0.01;
}

let holeRadius = 36;
let holeAngle = 0;

function draw() {
  // Clear
  context.fillStyle = "black";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "white";
  context.lineWidth = 1;
  context.beginPath();
  context.arc(540, 910, 530, holeAngle, holeAngle + Math.PI * (360 - holeRadius) / 180);
  context.stroke();

  balls.forEach((ball) => {
    ball.draw(context);
  });

  return canvas.toBuffer("raw");
}


(async () => {
  for (let i = 0; i < updates; i++) {
    update();

    if(i%updatesPerFrame === 0) {
      const buffer = draw();
      if(!ffmpeg.stdin.write(buffer)) {
        await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
      }
    }
  }

  ffmpeg.stdin.end();
})();
