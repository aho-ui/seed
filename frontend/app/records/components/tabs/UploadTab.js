'use client';
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../../../lib/config';
import { formatPercentage } from '../../../../utils/formatting';
import { getConfidenceColor } from '../../utils/helpers';

export default function UploadTab({ refreshRecords, onSeedDetailClick }) {
  const [file, setFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const uploadResultsRef = useRef(null);

  // Auto-scroll to results when upload completes
  useEffect(() => {
    if (uploadResult && uploadResultsRef.current) {
      uploadResultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [uploadResult]);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);
    if (f) {
      setPreview(URL.createObjectURL(f));
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await axios.post(`${API_URL}/api/upload/`, formData);

      if (res.data.seeds) {
        console.log(`${res.data.total_saved} seeds saved, ${res.data.total_duplicates} duplicates`);
      } else {
        console.log('Analysis saved with ID:', res.data.id);
      }

      setUploadResult(res.data);
      await refreshRecords();
    } catch (err) {
      console.error('Upload failed:', err);
      let errorMessage = err.message;
      if (err.response?.status === 409) {
        errorMessage = 'Image already exists in the database';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      setUploadResult({ error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>Upload Seed Image for Classification</h2>

      <div style={{ background: 'rgba(42, 42, 42, 0.5)', border: '1px solid #333', borderRadius: '8px', padding: '2rem', marginBottom: '2rem' }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{
            display: 'block',
            width: '100%',
            padding: '0.75rem',
            marginBottom: '1rem',
            background: '#1a1a1a',
            border: '1px solid #444',
            color: '#e0e0e0',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        />
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          style={{
            width: '100%',
            padding: '1rem',
            background: (!file || loading) ? '#333' : '#4caf50',
            border: 'none',
            color: (!file || loading) ? '#666' : '#fff',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: (!file || loading) ? 'not-allowed' : 'pointer',
            borderRadius: '4px',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => { if (file && !loading) e.currentTarget.style.background = '#45a049'; }}
          onMouseLeave={(e) => { if (file && !loading) e.currentTarget.style.background = '#4caf50'; }}
        >
          {loading ? 'Processing...' : 'Classify Image'}
        </button>
      </div>

      {uploadResult && (
        <div ref={uploadResultsRef} style={{ marginTop: '2rem' }}>
          {uploadResult.error ? (
            <div style={{ padding: '1.5rem', background: 'rgba(255, 107, 107, 0.2)', border: '1px solid #ff6b6b', borderRadius: '8px', color: '#ff6b6b' }}>
              <strong>Error:</strong> {uploadResult.error}
            </div>
          ) : uploadResult.seeds ? (
            <>
              {uploadResult.annotated_image && (
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                  <img
                    src={`data:image/jpeg;base64,${uploadResult.annotated_image}`}
                    alt="annotated"
                    style={{ maxWidth: '100%', borderRadius: '8px', border: '2px solid #333' }}
                  />
                </div>
              )}

              <div style={{ background: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4caf50', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#4caf50' }}>Detection Results</h3>
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{uploadResult.total_detected} seeds detected</p>
                <p style={{ color: '#aaa' }}>{uploadResult.total_saved} saved, {uploadResult.total_duplicates} duplicates | Processing: {uploadResult.processing_time_ms}ms</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {uploadResult.seeds.map((seed, idx) => (
                  <div
                    key={idx}
                    onClick={() => seed.status === 'saved' && onSeedDetailClick(seed)}
                    style={{
                      background: 'rgba(42, 42, 42, 0.7)',
                      border: seed.status === 'saved' ? '1px solid #333' : '1px solid #ff9800',
                      borderRadius: '8px',
                      padding: '1rem',
                      textAlign: 'center',
                      cursor: seed.status === 'saved' ? 'pointer' : 'default',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => { if (seed.status === 'saved') { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#4caf50'; } }}
                    onMouseLeave={(e) => { if (seed.status === 'saved') { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#333'; } }}
                  >
                    {seed.status === 'saved' ? (
                      <>
                        <img
                          src={`${API_URL}${seed.image_url}`}
                          alt={`Seed ${seed.id}`}
                          style={{
                            width: '100%',
                            height: '150px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            marginBottom: '0.75rem',
                            border: '1px solid #444'
                          }}
                        />
                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Seed #{seed.id}</div>
                        <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                          <span style={{ color: '#aaa' }}>Class:</span> {seed.class}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: getConfidenceColor(seed.confidence * 100) }}>
                          <span style={{ color: '#aaa' }}>Confidence:</span> {formatPercentage(seed.confidence)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>Click for details</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚠</div>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ff9800', marginBottom: '0.5rem' }}>Duplicate</div>
                        <div style={{ fontSize: '0.85rem', color: '#aaa' }}>Matches seed #{seed.existing_seed_id}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ background: 'rgba(42, 42, 42, 0.7)', border: '1px solid #333', borderRadius: '8px', padding: '2rem', textAlign: 'center' }}>
              {preview && (
                <img
                  src={preview}
                  alt="uploaded"
                  style={{ maxWidth: '300px', marginBottom: '1.5rem', borderRadius: '8px', border: '2px solid #444' }}
                />
              )}
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{uploadResult.detections[0]?.class}</h3>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                <span style={{ color: '#aaa' }}>Confidence:</span> {formatPercentage(uploadResult.detections[0]?.confidence)}
              </div>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                <span style={{ color: '#aaa' }}>Quality:</span> {uploadResult.detections[0]?.quality}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem' }}>
                Processing: {uploadResult.processing_time_ms}ms | Seed ID: {uploadResult.id}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
