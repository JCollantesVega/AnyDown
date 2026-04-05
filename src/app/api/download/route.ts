import { NextResponse } from 'next/server';
import { create } from 'youtube-dl-exec';
import path from 'path';
import os from 'os';

// Resolve boundary path issues dynamically to avoid Webpack/Next.js aliasing it to \ROOT\
const binaryPath = path.join(
  process.cwd(),
  'node_modules',
  'youtube-dl-exec',
  'bin',
  os.platform() === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
);

const youtubedl = create(binaryPath);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const format = searchParams.get('format') || 'mp4';
  const quality = searchParams.get('quality') || 'best';
  const title = searchParams.get('title') || 'download';

  if (!url) {
    return new NextResponse('Missing URL', { status: 400 });
  }

  const options: Record<string, any> = {
    noCheckCertificates: true,
    noWarnings: true,
    addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64)'],
    o: '-', // output to stdout
  };

  if (format === 'mp4') {
    if (quality === 'best') {
      options.f = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
    } else {
      options.f = `bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${quality}][ext=mp4]/best`;
    }
  } else if (['mp3', 'wav', 'm4a'].includes(format)) {
    options.extractAudio = true;
    options.audioFormat = format;
    if (quality === 'best') {
      options.audioQuality = 0;
    } else {
      options.audioQuality = quality === '192' ? 5 : (quality === '128' ? 7 : 0);
    }
  }

  try {
    const subprocess = youtubedl.exec(url, options);

    const readable = new ReadableStream({
      start(controller) {
        if (!subprocess.stdout) {
          controller.close();
          return;
        }
        subprocess.stdout.on('data', (chunk) => controller.enqueue(chunk));
        subprocess.stdout.on('end', () => controller.close());
        subprocess.stdout.on('error', (err) => controller.error(err));
      },
      cancel() {
        subprocess.kill();
      }
    });

    const headers = new Headers();
    const safeTitle = title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'download';
    headers.set('Content-Disposition', `attachment; filename="${safeTitle}.${format}"`);
    if (format === 'mp4') headers.set('Content-Type', 'video/mp4');
    else if (format === 'mp3') headers.set('Content-Type', 'audio/mpeg');
    else if (format === 'wav') headers.set('Content-Type', 'audio/wav');
    else if (format === 'm4a') headers.set('Content-Type', 'audio/mp4');
    else headers.set('Content-Type', 'application/octet-stream');
    
    // For Vercel Serverless to allow streaming response
    headers.set('Transfer-Encoding', 'chunked');

    return new NextResponse(readable, { headers });
  } catch (error: any) {
    console.error('Download error:', error);
    return new NextResponse('Error downloading: ' + error.message, { status: 500 });
  }
}
