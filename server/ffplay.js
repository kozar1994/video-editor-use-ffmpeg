import { spawn } from 'child_process';

let ffplayProcess = null;

export function startPreview(videoPath, filters, seekTime) {
  stopPreview();

  const args = [];
  if (seekTime) {
    args.push('-ss', seekTime);
  }
  args.push('-i', videoPath);
  if (filters) {
    args.push('-vf', filters);
  }

  ffplayProcess = spawn('ffplay', args, { stdio: ['ignore', 'ignore', 'inherit'] });

  ffplayProcess.on('error', (err) => {
    console.error('FFplay error:', err);
  });

  ffplayProcess.on('exit', () => {
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
