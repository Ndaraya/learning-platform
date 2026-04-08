interface Props {
  url: string
  title: string
}

export function VideoEmbed({ url, title }: Props) {
  // Vimeo: vimeo.com/123456789 or player.vimeo.com/video/123456789
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeoMatch) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-md">
        <iframe
          src={`https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0&badge=0`}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          aria-label={`Video: ${title}`}
        />
      </div>
    )
  }

  // YouTube: youtu.be/ID or youtube.com/watch?v=ID or youtube.com/embed/ID
  const youtubeMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?\s]+)/)
  if (youtubeMatch) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-md">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          aria-label={`Video: ${title}`}
        />
      </div>
    )
  }

  return <p className="text-destructive text-sm">Invalid video URL.</p>
}
