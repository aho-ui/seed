'use client'

import { useState } from 'react'
import axios from 'axios'
import Nav from './components/Nav'
import Modal from './components/Modal'
import { API_URL } from '../lib/config'
import { formatPercentage } from '../utils/formatting'

export default function Home() {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [enlargedImage, setEnlargedImage] = useState(null)

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    setFile(f)
    if (f) {
      setPreview(URL.createObjectURL(f))
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setLoading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await axios.post(`${API_URL}/api/upload/`, formData)

      // Handle multi-seed response format
      if (res.data.seeds) {
        console.log(`${res.data.total_saved} seeds saved, ${res.data.total_duplicates} duplicates`)
      } else {
        console.log('Analysis saved with ID:', res.data.id)
      }

      setResult(res.data)
    } catch (err) {
      console.error('Upload failed:', err)
      let errorMessage = err.message
      if (err.response?.status === 409) {
        errorMessage = 'Image already exists in the database'
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      }
      setResult({ error: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const getConfidenceClass = (confidence) => {
    const conf = confidence * 100
    if (conf >= 90) return 'confidence-high'
    if (conf >= 70) return 'confidence-medium'
    return 'confidence-low'
  }

  return (
    <>
      <Nav />
      <div className="container">
        <h1>Upload Seed Image</h1>

        <div className="upload-box">
          <input type="file" accept="image/*" onChange={handleFileChange} />
          <button onClick={handleUpload} disabled={!file || loading}>
            {loading ? 'Processing...' : 'Classify'}
          </button>
        </div>

        {result && (
          <>
            {result.error ? (
              <div className="result">
                <p className="error">{result.error}</p>
              </div>
            ) : result.seeds ? (
              <>
                {result.annotated_image && (
                  <div className="uploaded-image">
                    <img src={`data:image/jpeg;base64,${result.annotated_image}`} alt="annotated" />
                  </div>
                )}

                <div className="detection-summary">
                  <h2>Detection Results</h2>
                  <p>{result.total_detected} seeds detected</p>
                  <p>{result.total_saved} saved, {result.total_duplicates} duplicates | Processing: {result.processing_time_ms}ms</p>
                </div>

                <div className="seeds-scrollable">
                  {result.seeds.map((seed, idx) => (
                    <div key={idx} className="seed-card">
                      {seed.status === 'saved' ? (
                        <>
                          <img
                            src={`${API_URL}${seed.image_url}`}
                            alt={`Seed ${seed.id}`}
                            onClick={() => setEnlargedImage(`${API_URL}${seed.image_url}`)}
                            style={{ cursor: 'pointer' }}
                          />
                          <div className="seed-info">
                            <strong>Seed #{seed.id}</strong>
                            <p><span className="label">Class:</span> {seed.class}</p>
                            <p className={getConfidenceClass(seed.confidence)}>
                              <span className="label">Confidence:</span> {formatPercentage(seed.confidence)}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="duplicate-icon">
                            <span>⚠</span>
                          </div>
                          <div className="seed-info">
                            <strong>Duplicate</strong>
                            <p>Matches seed #{seed.existing_seed_id}</p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="result">
                {preview && <img src={preview} alt="uploaded" />}
                <div className="info">
                  <h2>{result.detections[0]?.class}</h2>
                  <p>Confidence: {formatPercentage(result.detections[0]?.confidence)}</p>
                  <p>Quality: {result.detections[0]?.quality}</p>
                  <p>Processing: {result.processing_time_ms}ms</p>
                  <p>Seed ID: {result.id}</p>
                </div>
              </div>
            )}
          </>
        )}

        <Modal image={enlargedImage} onClose={() => setEnlargedImage(null)} />
      </div>
    </>
  )
}
