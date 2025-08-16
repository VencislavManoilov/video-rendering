const { createCanvas } = require("canvas");
const { spawn } = require("child_process");

const width = 1080;
const height = 1920;
const canvas = createCanvas(width, height);
const context = canvas.getContext("2d");
const updates = 100;
const updatesPerFrame = 1;
const fps = 24;

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
  constructor(x, y) {
    this.x = x || 540;
    this.y = y || 910;
    this.hsl = random(360);
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
balls.push(new Ball(540, 910));

function random(max) {
  return Math.floor(Math.random() * max);
}

function update() {
  balls.forEach((ball) => {
    ball.x++;
  })
}

function draw() {
  // Clear
  context.fillStyle = "black";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "white";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(540, 910, 530, 0, 2 * Math.PI);
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
      ffmpeg.stdin.write(buffer);
    }
  }

  ffmpeg.stdin.end();
})();
