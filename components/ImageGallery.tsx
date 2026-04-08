'use client'

import { useState } from 'react'

interface Props {
  urls: string[]
  altPrefix?: string
}

export function ImageGallery({ urls, altPrefix = 'Image' }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  if (!urls || urls.length === 0) return null

  return (
    <>
      {/* Grid */}
      <div className={`grid gap-3 ${urls.length === 1 ? 'grid-cols-1' : urls.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {urls.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightbox(i)}
            className="group relative overflow-hidden rounded-lg border bg-gray-50 aspect-video focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ '--tw-ring-color': 'var(--brand)' } as React.CSSProperties}
            aria-label={`${altPrefix} ${i + 1} — click to enlarge`}
          >
            <img
              src={url}
              alt={`${altPrefix} ${i + 1}`}
              className="w-full h-full object-contain group-hover:opacity-90 transition-opacity"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">Enlarge</span>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          {/* Prev */}
          {lightbox > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1) }}
              className="absolute left-4 text-white text-3xl font-bold hover:text-gray-300 focus:outline-none"
              aria-label="Previous image"
            >
              ‹
            </button>
          )}

          <img
            src={urls[lightbox]}
            alt={`${altPrefix} ${lightbox + 1}`}
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {lightbox < urls.length - 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1) }}
              className="absolute right-4 text-white text-3xl font-bold hover:text-gray-300 focus:outline-none"
              aria-label="Next image"
            >
              ›
            </button>
          )}

          {/* Close */}
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-2xl font-bold hover:text-gray-300 focus:outline-none"
            aria-label="Close image viewer"
          >
            ✕
          </button>

          {urls.length > 1 && (
            <div className="absolute bottom-4 text-white text-sm">
              {lightbox + 1} / {urls.length}
            </div>
          )}
        </div>
      )}
    </>
  )
}
