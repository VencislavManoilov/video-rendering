const { createCanvas } = require("canvas");
const { spawn } = require("child_process");

const width = 1080;
const height = 1920;
const canvas = createCanvas(width, height);
const context = canvas.getContext("2d");
const frames = 100;
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

function draw(i) {
  context.fillStyle = "black";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "blue";
  context.beginPath();
  context.arc(200, 200, 50 + i, 0, Math.PI * 2);
  context.fill();

  return canvas.toBuffer("raw");
}


(async () => {
  for (let i = 0; i < frames; i++) {
    const buffer = draw(i);
    ffmpeg.stdin.write(buffer);
  }

  ffmpeg.stdin.end();
})();
