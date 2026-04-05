'use client';
import { useState } from 'react';
import { Search, Download, Video, Loader2, AlertCircle } from 'lucide-react';
import styles from './page.module.css';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState<any>(null);

  const [tab, setTab] = useState<'video' | 'audio'>('video');
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState('best');
  const [downloading, setDownloading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setLoading(true);
    setError('');
    setInfo(null);
    
    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        throw new Error('No se pudo obtener información del vídeo o playlist. Revisa el enlace e intentalo de nuevo.');
      }
      const data = await res.json();
      setInfo(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (videoUrl: string = url, videoTitle: string = info?.title || 'download') => {
    // We cannot reliably track multiple downloads state with a single boolean easily,
    // but for individual buttons it's fine. We'll set a generic downloading state.
    setDownloading(true);
    const finalFormat = tab === 'video' ? 'mp4' : format;
    const titleParam = videoTitle ? `&title=${encodeURIComponent(videoTitle)}` : '';
    const downloadUrl = `/api/download?url=${encodeURIComponent(videoUrl)}&format=${finalFormat}&quality=${quality}${titleParam}`;
    
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setTimeout(() => {
      setDownloading(false);
    }, 4000);
  };

  const handleDownloadAll = async () => {
    if (!info?.entries) return;
    setDownloadingAll(true);
    
    // Trigger download for each item with a delay to prevent browser block/crash
    for (const entry of info.entries) {
      handleDownload(`https://youtube.com/watch?v=${entry.id}`, entry.title);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    setDownloadingAll(false);
  };

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>
        Any<span>Down</span>
      </h1>
      <p className={styles.subtitle}>
        Descarga vídeos y listas de reproducción de YouTube en la más alta calidad sin complicaciones.
      </p>

      <form className={styles.searchContainer} onSubmit={handleSearch}>
        <div className={styles.inputWrapper}>
          <input 
            type="url" 
            required 
            placeholder="Pega el enlace de YouTube aquí (Vídeo o Playlist)..." 
            className={styles.input}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" className={styles.searchBtn} disabled={loading}>
            {loading ? <Loader2 className={styles.loader} size={20} /> : <Search size={20} />}
            <span>Analizar</span>
          </button>
        </div>
      </form>

      {error && (
        <div className={styles.error}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {info && (
        <div className={styles.resultsContainer}>
          <div className={styles.videoCard}>
            <div className={styles.thumbnailWrapper}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={info.thumbnail || '/placeholder.png'} alt="Thumbnail" className={styles.thumbnail} />
            </div>
            
            <div className={styles.videoInfo}>
              <h3 className={styles.videoTitle}>{info.title || 'Múltiples Vídeos (Playlist)'}</h3>
              <p className={styles.videoChannel}>
                 {info.channel && <Video size={16} />} {info.channel || (info.entries ? `${info.entries.length} videos en la lista` : '')}
              </p>

              <div className={styles.optionsSection}>
                <div className={styles.tabs}>
                  <div 
                    className={`${styles.tab} ${tab === 'video' ? styles.active : ''}`}
                    onClick={() => setTab('video')}
                  >
                    Video
                  </div>
                  <div 
                    className={`${styles.tab} ${tab === 'audio' ? styles.active : ''}`}
                    onClick={() => { setTab('audio'); setFormat('mp3'); }}
                  >
                    Audio
                  </div>
                </div>

                <div className={styles.selectGroup}>
                  {tab === 'audio' && (
                    <select 
                      className={styles.select} 
                      value={format} 
                      onChange={(e) => setFormat(e.target.value)}
                    >
                      <option value="mp3">MP3</option>
                      <option value="wav">WAV</option>
                      <option value="m4a">M4A</option>
                    </select>
                  )}
                  
                  <select 
                    className={styles.select} 
                    value={quality} 
                    onChange={(e) => setQuality(e.target.value)}
                  >
                    {tab === 'video' ? (
                      <>
                        <option value="best">Mejor Calidad (1080p+)</option>
                        <option value="1080">1080p</option>
                        <option value="720">720p</option>
                        <option value="480">480p</option>
                      </>
                    ) : (
                      <>
                        <option value="best">Mejor Audio (320kbps)</option>
                        <option value="192">192kbps</option>
                        <option value="128">128kbps</option>
                      </>
                    )}
                  </select>
                </div>

                {!info.entries ? (
                  <button 
                    className={styles.downloadBtn} 
                    onClick={() => handleDownload(url, info.title)}
                    disabled={downloading}
                  >
                    {downloading ? <Loader2 className={styles.loader} size={20} /> : <Download size={20} />}
                    <span>{downloading ? 'Iniciando descarga...' : 'Descargar Ahora'}</span>
                  </button>
                ) : (
                  <div className={styles.playlistContainer}>
                    <div className={styles.playlistHeader}>
                      <p className={styles.playlistWarning}>Opciones de lista de reproducción:</p>
                      <button 
                        className={styles.downloadAllBtn} 
                        onClick={handleDownloadAll}
                        disabled={downloadingAll}
                      >
                        {downloadingAll ? <Loader2 className={styles.loader} size={16} /> : <Download size={16} />}
                        <span>{downloadingAll ? 'Procesando...' : 'Descargar Todas'}</span>
                      </button>
                    </div>
                    <div className={styles.playlistItems}>
                      {info.entries.map((entry: any) => (
                        <div key={entry.id} className={styles.playlistItem}>
                          <div className={styles.playlistItemTitle}>{entry.title}</div>
                          <button 
                            className={styles.playlistDownloadBtn}
                            onClick={() => handleDownload(`https://youtube.com/watch?v=${entry.id}`, entry.title)}
                            title="Descargar este elemento"
                          >
                            <Download size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
