'use client'

import { useState } from 'react'
import axios from 'axios'
import Nav from '../components/Nav'
import Modal from '../components/Modal'
import { API_URL } from '../../lib/config'
import { formatPercentage } from '../../utils/formatting'

export default function Verify() {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [enlargedImage, setEnlargedImage] = useState(null)

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    setFile(f)
  }

  const handleVerify = async () => {
    if (!file) return

    setLoading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await axios.post(`${API_URL}/api/verify/`, formData)
      setResult({ success: true, data: res.data })
    } catch (err) {
      setResult({ success: false, error: err.response?.data?.error || err.response?.data?.message || err.message })
    } finally {
      setLoading(false)
    }
  }

  const getStatusClass = (status) => {
    if (status === 'certified') return 'status-certified'
    if (status === 'found_not_certified') return 'status-found'
    if (status === 'match_no_blockchain') return 'status-match'
    return 'status-not-found'
  }

  const getStatusText = (status) => {
    if (status === 'certified') return 'CERTIFIED'
    if (status === 'found_not_certified') return 'FOUND (Not Certified)'
    if (status === 'match_no_blockchain') return 'MATCH (No Blockchain)'
    return 'NOT FOUND'
  }

  return (
    <>
      <Nav />
      <div className="container">
        <h1>Verify Seed Authenticity</h1>

        <div className="verify-form">
          <div className="form-group">
            <label>Upload Image to Verify:</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </div>

          <button onClick={handleVerify} disabled={!file || loading}>
            {loading ? 'Verifying...' : 'Verify on Blockchain'}
          </button>
        </div>

        {result && result.success && (
          <>
            {result.data.annotated_image && (
              <div className="uploaded-image">
                <img src={`data:image/jpeg;base64,${result.data.annotated_image}`} alt="annotated" />
              </div>
            )}

            <div className="detection-summary">
              <h2>Verification Results</h2>
              <p>{result.data.total_detected} entities identified</p>
              <p>{result.data.total_certified} certified, {result.data.total_not_found} not found | Processing: {result.data.processing_time_ms}ms</p>
            </div>

            <div className="seeds-scrollable">
              {result.data.verifications.map((verification, idx) => (
                <div key={idx} className="seed-card">
                  {verification.status !== 'not_found' ? (
                    <>
                      <img
                        src={`data:image/jpeg;base64,${verification.cropped_image}`}
                        alt={`Verification ${idx}`}
                        onClick={() => setEnlargedImage(`data:image/jpeg;base64,${verification.cropped_image}`)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div className="seed-info">
                        <strong>Seed #{verification.seed_id}</strong>
                        <p><span className="label">Class:</span> {verification.class}</p>
                        <p><span className="label">Similarity:</span> {formatPercentage(verification.similarity)}</p>
                        {verification.signer_name && (
                          <p><span className="label">Certifier:</span> {verification.signer_name}</p>
                        )}
                        <div className={`verify-status ${getStatusClass(verification.status)}`}>
                          {getStatusText(verification.status)}
                        </div>
                        {verification.blockchains && (
                          <div className="blockchain-info">
                            {Object.entries(verification.blockchains).map(([name, bc]) => (
                              bc.found && (
                                <p key={name}>
                                  <span className="label">{name}:</span> {bc.certified ? '✓ Certified' : '○ Found'}
                                  {bc.signer_name && <span> ({bc.signer_name})</span>}
                                </p>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <img
                        src={`data:image/jpeg;base64,${verification.cropped_image}`}
                        alt={`Not found ${idx}`}
                        onClick={() => setEnlargedImage(`data:image/jpeg;base64,${verification.cropped_image}`)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div className="seed-info">
                        <strong>No Match</strong>
                        <p><span className="label">Class:</span> {verification.class}</p>
                        <p><span className="label">Confidence:</span> {formatPercentage(verification.confidence)}</p>
                        <div className={`verify-status ${getStatusClass(verification.status)}`}>
                          {getStatusText(verification.status)}
                        </div>
                        <p>{verification.message}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {result && !result.success && (
          <div className="error">
            <p>{result.error}</p>
          </div>
        )}

        <Modal image={enlargedImage} onClose={() => setEnlargedImage(null)} />
      </div>

      <style jsx>{`
        .verify-status {
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          text-align: center;
          font-weight: 600;
          margin: 0.5rem 0;
          font-size: 0.85rem;
          letter-spacing: 0.5px;
        }

        .status-certified {
          background: rgba(76, 175, 80, 0.15);
          color: #4caf50;
          border: 2px solid rgba(76, 175, 80, 0.3);
        }

        .status-found {
          background: rgba(255, 152, 0, 0.15);
          color: #ff9800;
          border: 2px solid rgba(255, 152, 0, 0.3);
        }

        .status-match {
          background: rgba(33, 150, 243, 0.15);
          color: #2196F3;
          border: 2px solid rgba(33, 150, 243, 0.3);
        }

        .status-not-found {
          background: rgba(255, 107, 107, 0.15);
          color: #ff6b6b;
          border: 2px solid rgba(255, 107, 107, 0.3);
        }

        .blockchain-info {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid #2a2a2a;
        }

        .blockchain-info p {
          margin: 0.25rem 0;
          font-size: 0.85rem;
        }
      `}</style>
    </>
  )
}
