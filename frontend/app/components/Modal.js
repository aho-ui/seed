'use client'

export default function Modal({ image, onClose }) {
  if (!image) return null

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content">
        <img src={image} alt="Enlarged view" />
      </div>

      <style jsx>{`
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          cursor: pointer;
        }

        .modal-content {
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-content img {
          max-width: 100%;
          max-height: 90vh;
          object-fit: contain;
          border-radius: 8px;
        }
      `}</style>
    </div>
  )
}
