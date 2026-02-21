import { useState } from 'react'
import ImageViewer from './ImageViewer'
import './VisualGuidesModal.css'

interface VisualGuidesModalProps {
  isOpen: boolean
  onClose: () => void
}

const VISUAL_GUIDES = [
  '1.6 Early Game Visual Cheat Sheet.png',
  'A Visual Guide to Innovating.png',
  'A Visual Guide to Resource Farming.png',
  'A Visual Guide to the Butcher.png',
  'A Visual Guide to the Dragon King.png',
  'A Visual Guide to the Dung Beetle Knight.png',
  'A Visual Guide to the Early Game Expansions.png',
  'A Visual Guide to the Gorm.png',
  'A Visual Guide to the King\'s Man.png',
  'A Visual Guide to the Lonely Tree.png',
  'A Visual Guide to the Screaming Antelope 1-6.png',
  'A Visual Guide to the Slenderest of Men.png',
  'A Visual Guide to the Spidicules.png',
  'A Visual Guide to the Sunstalker.png',
  'A Visual Guide to the White Lion.png',
  'Early Game Model Hunt Team - Core (1).png',
  'Early Game Model Hunt Team - Core.png',
  'Early Game Model Hunt Team - Gorm.png',
  'Late Game Model Hunt Team - Core.png',
  'Mid Game Model Hunt Team - Core.png',
]

export default function VisualGuidesModal({ isOpen, onClose }: VisualGuidesModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)

  if (!isOpen && selectedImageIndex === null) return null

  const getDisplayName = (filename: string): string => {
    return filename.replace(/\.png$/i, '')
  }

  const allImages = VISUAL_GUIDES.map(filename => ({
    src: `${import.meta.env.BASE_URL}visual-guides/${encodeURIComponent(filename)}`,
    name: getDisplayName(filename)
  }))

  if (selectedImageIndex !== null) {
    return (
      <ImageViewer
        imagePath={allImages[selectedImageIndex].src}
        imageName={allImages[selectedImageIndex].name}
        onClose={() => setSelectedImageIndex(null)}
        allImages={allImages}
        initialIndex={selectedImageIndex}
        onImageChange={setSelectedImageIndex}
      />
    )
  }

  return (
    <div className="visual-guides-modal-overlay" onClick={onClose}>
      <div className="visual-guides-modal" onClick={e => e.stopPropagation()}>
        <div className="visual-guides-header">
          <h1>Fen's Visual Guides</h1>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="visual-guides-list">
          {VISUAL_GUIDES.map((guide, index) => (
            <button
              key={index}
              className="guide-item"
              onClick={() => setSelectedImageIndex(index)}
            >
              <span className="guide-icon">🖼️</span>
              <span className="guide-name">{getDisplayName(guide)}</span>
              <span className="guide-arrow">→</span>
            </button>
          ))}
        </div>

        <div className="visual-guides-footer">
          <p>Total guides: {VISUAL_GUIDES.length}</p>
        </div>
      </div>
    </div>
  )
}
