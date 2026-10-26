"use client";

import { useState } from "react";

// Le lecteur YouTube n'est chargé qu'au clic : aucune requête vers YouTube avant le choix du lecteur.
export function YouTubePlayer({
  youtubeId,
  title,
  vertical,
  duration,
}: {
  youtubeId: string;
  title: string;
  vertical?: boolean;
  duration?: string;
}) {
  const [on, setOn] = useState(false);
  const cls = `player ${vertical ? "v" : "h"}`;
  if (on) {
    return (
      <div className={cls}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }
  return (
    <button type="button" className={cls} onClick={() => setOn(true)} aria-label={`Lire la vidéo : ${title} (lecteur YouTube)`}>
      <span className="src">YouTube</span>
      <span className="play" aria-hidden="true">
        <svg width="18" height="20" viewBox="0 0 16 18"><path d="M0 0 16 9 0 18Z" fill="#1E224A" /></svg>
      </span>
      {duration && <span className="dur">{duration}</span>}
    </button>
  );
}
