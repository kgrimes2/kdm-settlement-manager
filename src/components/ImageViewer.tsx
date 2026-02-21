import { useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import './ImageViewer.css'

interface ImageViewerProps {
  imagePath: string
  imageName: string
  onClose: () => void
  allImages?: Array<{ src: string; name: string }>
  initialIndex?: number
  onImageChange?: (index: number) => void
}

export default function ImageViewer({
  imagePath,
  imageName,
  onClose,
  allImages = [],
  initialIndex = 0,
  onImageChange
}: ImageViewerProps) {
  const [index, setIndex] = useState(initialIndex)

  const handleIndexChange = (newIndex: number) => {
    setIndex(newIndex)
    onImageChange?.(newIndex)
  }

  // Prepare slides for lightbox
  const slides = allImages.length > 0
    ? allImages.map(img => ({
        src: img.src,
        title: img.name
      }))
    : [{ src: imagePath, title: imageName }]

  return (
    <Lightbox
      slides={slides}
      open={true}
      close={onClose}
      index={index}
      on={{
        view: ({ index: newIndex }) => handleIndexChange(newIndex)
      }}
      plugins={[Zoom, Thumbnails]}
      zoom={{
        maxZoomPixelRatio: 10,
        scrollToZoom: true
      }}
      thumbnails={{
        position: 'bottom',
        width: 100,
        height: 60,
        gap: 8
      }}
      carousel={{
        preload: 2,
        finite: false
      }}
      styles={{
        container: { backgroundColor: 'rgba(0, 0, 0, .9)' }
      }}
    />
  )
}
