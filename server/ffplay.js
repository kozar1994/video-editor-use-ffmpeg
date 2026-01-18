import { spawn } from 'child_process';
import { join } from "path";

let ffplayProcess = null;

export function startPreview(videoPath, filters, seekTime) {
  stopPreview();

  const args = [];
  if (seekTime) {
    args.push("-ss", seekTime);
  }
  const fullVideoPath = videoPath.startsWith("/")
    ? videoPath
    : join(process.cwd(), videoPath);
  args.push("-i", fullVideoPath);
  args.push("-sws_flags", "lanczos+accurate_rnd");
  args.push("-autoexit");
  if (filters) {
    args.push("-vf", filters);
  }

  console.log("Spawning ffplay with args:", args);
  ffplayProcess = spawn("ffplay", args, {
    stdio: ["ignore", "ignore", "inherit"],
  });

  ffplayProcess.on("error", (err) => {
    console.error("FFplay failed to spawn:", err);
  });

  ffplayProcess.on("exit", (code, signal) => {
    console.log(`FFplay process exited with code ${code} and signal ${signal}`);
    ffplayProcess = null;
  });
}

export function stopPreview() {
  if (ffplayProcess) {
    try {
      ffplayProcess.kill();
    } catch (err) {
      console.error('Error killing ffplay:', err);
    }
    ffplayProcess = null;
  }
}

export function isPreviewRunning() {
  return ffplayProcess !== null;
}
