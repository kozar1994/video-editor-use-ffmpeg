import { spawn, ChildProcess } from 'child_process';

let ffplayProcess: ChildProcess | null = null;

export function startPreview(videoPath: string, filters: string, seekTime?: string): void {
  stopPreview();

  const args: string[] = [];
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

export function stopPreview(): void {
  if (ffplayProcess) {
    try {
      ffplayProcess.kill();
    } catch (err) {
      console.error('Error killing ffplay:', err);
    }
    ffplayProcess = null;
  }
}

export function isPreviewRunning(): boolean {
  return ffplayProcess !== null;
}
