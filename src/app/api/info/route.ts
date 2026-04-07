import { NextResponse } from 'next/server';
import { create } from 'youtube-dl-exec';
import path from 'path';
import os from 'os';

// En producción Docker, usamos el binario global directo (más estable en contenedores Alpine)
const isProd = process.env.NODE_ENV === 'production';
const binaryPath = isProd 
  ? '/usr/local/bin/yt-dlp' 
  : path.join(
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

  if (!url) {
    return NextResponse.json({ error: 'Falta el parámetro URL' }, { status: 400 });
  }

  try {
    const info: any = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64)'],
    });

    return NextResponse.json({
      title: info.title,
      thumbnail: info.thumbnail || (info.entries && info.entries[0]?.thumbnail),
      channel: info.uploader || info.channel,
      duration: info.duration,
      entries: info.entries ? info.entries.map((e: any) => ({
        id: e.id,
        title: e.title,
        duration: e.duration,
      })) : undefined
    });
  } catch (error: any) {
    console.error('Info fetching error:', error);
    return NextResponse.json({ error: 'Error obteniendo metadata. ' + error.message }, { status: 500 });
  }
}
