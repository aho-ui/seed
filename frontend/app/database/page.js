'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import Nav from '../components/Nav'
import { API_URL } from '../../lib/config'
import { formatPercentage } from '../../utils/formatting'

export default function Database() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [selectedSeed, setSelectedSeed] = useState(null)

  useEffect(() => {
    axios.get(`${API_URL}/api/database/`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) return (
    <>
      <Nav />
      <div className="container">
        <h1>Database Records</h1>
        <p className="loading">Loading...</p>
      </div>
    </>
  )

  // Pagination logic
  const totalPages = Math.ceil(data.records.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentRecords = data.records.slice(startIndex, endIndex)

  const goToPage = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value))
    setCurrentPage(1)
  }

  return (
    <>
      <Nav />
      <div className="container">
        <h1>Database Records</h1>

        <div className="stats">
          <p>Total Records: {data.total}</p>
          <p>Blockchain Synced: {data.blockchain_synced}</p>
          <p>Page {currentPage} of {totalPages}</p>
          <div className="items-per-page">
            <label>Items per page:</label>
            <select value={itemsPerPage} onChange={handleItemsPerPageChange}>
              <option value={5}>5</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={75}>75</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Prediction</th>
              <th>Confidence</th>
              <th>Quality</th>
              <th>Blockchain</th>
              <th>Type</th>
              <th>Certifier</th>
              <th>TX ID</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map(r => {
              return (
                <tr key={r.id} onClick={() => setSelectedSeed(r)} style={{ cursor: 'pointer' }}>
                  <td>{r.id}</td>
                  <td>{r.prediction}</td>
                  <td>{formatPercentage(r.confidence)}</td>
                  <td>{r.quality}</td>
                  <td>{r.blockchain_synced ? '✓' : '✗'}</td>
                  <td>{r.blockchain_type || '-'}</td>
                  <td>{r.signer_name || 'Unknown'}</td>
                  <td className="blockchain-tx">{r.blockchain_tx_id ? r.blockchain_tx_id.substring(0, 24) + '...' : '-'}</td>
                  <td>{new Date(r.uploaded_at).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => goToPage(i + 1)}
                className={currentPage === i + 1 ? 'active' : ''}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}

        {selectedSeed && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}
            onClick={() => setSelectedSeed(null)}
          >
            <div
              style={{
                backgroundColor: '#1a1a1a',
                border: '2px solid #333',
                borderRadius: '12px',
                padding: '30px',
                maxWidth: '800px',
                maxHeight: '90vh',
                overflow: 'auto',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedSeed(null)}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: 'transparent',
                  color: '#fff',
                  border: 'none',
                  fontSize: '30px',
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1
                }}
              >
                ×
              </button>

              <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#e0e0e0' }}>
                Seed Details - ID #{selectedSeed.id}
              </h2>

              {selectedSeed.image_url && (
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                  <img
                    src={`${API_URL}${selectedSeed.image_url}`}
                    alt="Seed"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '400px',
                      borderRadius: '8px',
                      border: '2px solid #333'
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', color: '#e0e0e0' }}>
                <div>
                  <strong>Prediction:</strong> {selectedSeed.prediction}
                </div>
                <div>
                  <strong>Confidence:</strong> {formatPercentage(selectedSeed.confidence)}
                </div>
                <div>
                  <strong>Quality:</strong> {selectedSeed.quality}
                </div>
                <div>
                  <strong>Processing Time:</strong> {selectedSeed.processing_time_ms}ms
                </div>
                <div>
                  <strong>Image Size:</strong> {selectedSeed.image_width} × {selectedSeed.image_height}
                </div>
                <div>
                  <strong>Uploaded:</strong> {new Date(selectedSeed.uploaded_at).toLocaleString()}
                </div>
                <div>
                  <strong>Blockchain:</strong> {selectedSeed.blockchain_synced ? '✓ Certified' : '✗ Not Certified'}
                </div>
                <div>
                  <strong>Blockchain Type:</strong> {selectedSeed.blockchain_type || 'N/A'}
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>Certifier:</strong> {selectedSeed.signer_name || 'Unknown'}
                </div>
                {selectedSeed.blockchain_tx_id && (
                  <div style={{ gridColumn: '1 / -1', wordBreak: 'break-all' }}>
                    <strong>Transaction ID:</strong> {selectedSeed.blockchain_tx_id}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
