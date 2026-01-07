'use client';
import { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../../../lib/config';
import { getConfidenceColor } from '../../utils/helpers';

export default function VerifyTab({ onVerifyDetailClick, onImageEnlarge }) {
  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyPreview, setVerifyPreview] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const handleVerifyFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setVerifyFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVerifyPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleVerify = async () => {
    if (!verifyFile) return;

    setVerifyLoading(true);
    setVerifyResult(null);

    try {
      const formData = new FormData();
      formData.append('image', verifyFile);

      const res = await axios.post(`${API_URL}/api/verify/`, formData);
      setVerifyResult(res.data);
    } catch (err) {
      console.error('Verification failed:', err);
      let errorMessage = err.message;
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      setVerifyResult({ error: errorMessage });
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>Verify Seed Authenticity on Blockchain</h2>

      <div style={{ background: 'rgba(42, 42, 42, 0.5)', border: '1px solid #333', borderRadius: '8px', padding: '2rem', marginBottom: '2rem' }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleVerifyFileChange}
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
          onClick={handleVerify}
          disabled={!verifyFile || verifyLoading}
          style={{
            width: '100%',
            padding: '1rem',
            background: (!verifyFile || verifyLoading) ? '#333' : '#4caf50',
            border: 'none',
            color: (!verifyFile || verifyLoading) ? '#666' : '#fff',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: (!verifyFile || verifyLoading) ? 'not-allowed' : 'pointer',
            borderRadius: '4px',
            transition: 'all 0.3s',
            pointerEvents: (!verifyFile || verifyLoading) ? 'none' : 'auto'
          }}
          onMouseEnter={(e) => { if (verifyFile && !verifyLoading) e.currentTarget.style.background = '#45a049'; }}
          onMouseLeave={(e) => { if (verifyFile && !verifyLoading) e.currentTarget.style.background = '#4caf50'; }}
        >
          {verifyLoading ? 'Verifying...' : 'Verify Seed'}
        </button>
      </div>

      {/* Verification Results */}
      {verifyResult && (
        <div>
          {verifyResult.error ? (
            <div style={{ background: 'rgba(244, 67, 54, 0.1)', border: '1px solid #f44336', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#f44336' }}>Verification Failed</h3>
              <p style={{ color: '#aaa' }}>{verifyResult.error}</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div style={{ background: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4caf50', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#4caf50' }}>Verification Results</h3>
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{verifyResult.total_detected} seeds detected</p>
                <p style={{ color: '#aaa' }}>
                  {verifyResult.total_certified} certified, {verifyResult.total_not_found} not found | Processing: {verifyResult.processing_time_ms}ms
                </p>
              </div>

              {/* Annotated Image */}
              {verifyResult.annotated_image && (
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#aaa' }}>Detected Seeds</h3>
                  <img
                    src={`data:image/jpeg;base64,${verifyResult.annotated_image}`}
                    alt="Annotated result"
                    style={{ maxWidth: '100%', borderRadius: '8px', border: '2px solid #333', cursor: 'pointer' }}
                    onClick={() => onImageEnlarge(`data:image/jpeg;base64,${verifyResult.annotated_image}`)}
                  />
                </div>
              )}

              {/* Verification Details */}
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#aaa' }}>Verification Details</h3>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {verifyResult.verifications.map((verification, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      if (verification.status === 'certified') {
                        const certifiedBlockchain = Object.entries(verification.blockchains || {}).find(([name, data]) => data.certified);
                        if (certifiedBlockchain) {
                          const [bcName, bcData] = certifiedBlockchain;
                          onVerifyDetailClick({
                            id: verification.seed_id,
                            status: 'certified',
                            seed_id: verification.seed_id,
                            similarity: (verification.similarity * 100).toFixed(1),
                            class: verification.class,
                            confidence: (verification.confidence * 100).toFixed(1),
                            blockchain: bcName.charAt(0).toUpperCase() + bcName.slice(1),
                            certifier: verification.signer_name || bcData.signer_name || 'Unknown',
                            tx_id: bcData.tx_id,
                            date: new Date(bcData.timestamp).toLocaleString()
                          });
                        }
                      } else {
                        onVerifyDetailClick({
                          id: index,
                          status: 'not_found',
                          class: verification.class,
                          confidence: verification.confidence.toFixed(1)
                        });
                      }
                    }}
                    style={{
                      background: 'rgba(42, 42, 42, 0.7)',
                      border: `2px solid ${verification.status === 'certified' ? '#4caf50' : '#ff6b6b'}`,
                      borderRadius: '8px',
                      padding: '1.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = `0 4px 12px ${verification.status === 'certified' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 107, 107, 0.3)'}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                      <div style={{ width: '150px', height: '150px', background: '#1a1a1a', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #444', flexShrink: 0 }}>
                        {verification.cropped_image ? (
                          <img
                            src={`data:image/jpeg;base64,${verification.cropped_image}`}
                            alt="Seed crop"
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }}
                          />
                        ) : (
                          <span style={{ color: '#555' }}>[Seed Crop]</span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '1rem', color: verification.status === 'certified' ? '#4caf50' : '#ff6b6b' }}>
                          {verification.status === 'certified' ? 'CERTIFIED' : verification.status === 'not_found' ? 'NOT FOUND' : 'NOT CERTIFIED'}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.95rem' }}>
                          {verification.status === 'certified' && (
                            <>
                              <div><strong>Seed ID:</strong> #{verification.seed_id}</div>
                              <div><strong>Similarity:</strong> <span style={{ color: '#4caf50' }}>{(verification.similarity * 100).toFixed(1)}%</span></div>
                            </>
                          )}
                          <div><strong>Class:</strong> {verification.class}</div>
                          <div><strong>Confidence:</strong> {(verification.confidence * 100).toFixed(1)}%</div>
                          {verification.status === 'certified' && verification.blockchains && (
                            <>
                              {Object.entries(verification.blockchains).filter(([name, data]) => data.certified).map(([bcName, bcData]) => (
                                <>
                                  <div><strong>Blockchain:</strong> {bcName.charAt(0).toUpperCase() + bcName.slice(1)}</div>
                                  <div><strong>Certifier:</strong> {verification.signer_name || bcData.signer_name || 'Unknown'}</div>
                                </>
                              ))}
                            </>
                          )}
                        </div>
                        {verification.status === 'certified' && verification.blockchains && Object.entries(verification.blockchains).filter(([name, data]) => data.certified).map(([bcName, bcData]) => (
                          <div key={bcName} style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '4px', fontSize: '0.85rem' }}>
                            <div><strong>TX ID:</strong> <span style={{ color: '#666', wordBreak: 'break-all' }}>{bcData.tx_id}</span></div>
                            <div style={{ marginTop: '0.25rem' }}><strong>Date:</strong> {new Date(bcData.timestamp).toLocaleString()}</div>
                          </div>
                        ))}
                        {verification.status === 'not_found' && (
                          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255, 107, 107, 0.1)', borderRadius: '4px', fontSize: '0.9rem', color: '#ff6b6b' }}>
                            No matching record found in database. This seed may be uncertified or counterfeit.
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '1rem', textAlign: 'right' }}>Click for details</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
