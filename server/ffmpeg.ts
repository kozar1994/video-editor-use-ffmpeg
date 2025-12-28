import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export class FFmpegManager extends EventEmitter {
  private proc: ChildProcess | null = null;

  async startExport(videoPath: string, filters: string, options: { quality: 'fast'|'medium'|'high'; endTime?: number; startTime?: number; outputPath?: string; }): Promise<string> {
    this.stopExport();
    const args: string[] = [];
    if (options.startTime) {
      args.push('-ss', String(options.startTime));
    }
    args.push('-i', videoPath);
    if (filters) {
      // Append filters to -vf
      args.push('-vf', filters);
    }
    // quality presets
    if (options.quality === 'fast') {
      args.push('-preset', 'ultrafast', '-crf', '28');
    } else if (options.quality === 'medium') {
      args.push('-preset', 'medium', '-crf', '23');
    } else {
      args.push('-preset', 'slow', '-crf', '18');
    }
    const outputPath = options.outputPath || '/tmp/output_filtered.mp4';
    if (typeof options.endTime === 'number' && isFinite(options.endTime)) {
      args.push('-to', String(options.endTime));
    }
    const finalArgs = args.filter(a => a !== '');
    finalArgs.push(outputPath);

    this.proc = spawn('ffmpeg', finalArgs, { stdio: ['ignore','ignore','inherit'] });

    this.proc!.on('error', (err) => this.emit('error', err));
    this.proc!.on('close', (code) => {
      this.proc = null;
      this.emit('done', code);
    });

    // Placeholder progress; real parsing could be added by reading stderr
    return Promise.resolve(outputPath);
  }

  stopExport() {
    if (this.proc) {
      try { this.proc.kill(); } catch {}
      this.proc = null;
    }
  }

  getProgress(): number {
    // Placeholder
    return 0;
  }
}
