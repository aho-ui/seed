'use client';
import Modal from '../../../components/Modal';
import { getConfidenceColor } from '../../utils/helpers';

export default function VerifyDetailModal({ verifyData, onClose }) {
  if (!verifyData) return null;

  return (
    <Modal onClose={onClose}>
      <div style={{ maxWidth: '700px', width: '90vw', maxHeight: '85vh', overflowY: 'auto', background: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)', padding: '1.5rem', borderRadius: '12px', color: '#e0e0e0' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '0.5rem', color: verifyData.status === 'certified' ? '#4caf50' : '#ff6b6b' }}>
          {verifyData.status === 'certified' ? 'CERTIFIED SEED' : 'SEED NOT FOUND'}
        </h2>
        <div style={{ color: '#666', fontSize: '0.8rem', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
          Verification result
        </div>

        {verifyData.status === 'certified' ? (
          <>
            {/* Verification Status */}
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.05))', borderRadius: '8px', border: '2px solid #4caf50' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#4caf50', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Verification
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.15rem' }}>Matched ID</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4caf50' }}>#{verifyData.seed_id}</div>
                </div>
                <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.15rem' }}>Similarity</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4caf50' }}>{verifyData.similarity}%</div>
                </div>
              </div>
            </div>

            {/* Seed Classification */}
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(42, 42, 42, 0.5)', borderRadius: '8px', border: '1px solid #333' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Classification
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                  <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Class:</span>
                  <div style={{ marginTop: '0.15rem', fontSize: '0.9rem', fontWeight: 'bold' }}>{verifyData.class}</div>
                </div>
                <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                  <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Confidence:</span>
                  <div style={{ marginTop: '0.15rem', fontSize: '0.9rem', fontWeight: 'bold', color: getConfidenceColor(verifyData.confidence) }}>{verifyData.confidence}%</div>
                </div>
              </div>
            </div>

            {/* Blockchain Certification */}
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.05))', borderRadius: '8px', border: '2px solid #4caf50' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#4caf50', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Blockchain
              </h3>
              <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                    <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Type:</span>
                    <div style={{ marginTop: '0.15rem', fontSize: '0.9rem', fontWeight: 'bold', color: '#4caf50' }}>{verifyData.blockchain}</div>
                  </div>
                  <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                    <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Certifier:</span>
                    <div style={{ marginTop: '0.15rem', fontSize: '0.9rem', fontWeight: 'bold' }}>{verifyData.certifier}</div>
                  </div>
                </div>
                <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                  <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>TX ID:</span>
                  <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', fontFamily: 'monospace', color: '#4caf50', wordBreak: 'break-all' }}>{verifyData.tx_id}</div>
                </div>
                <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                  <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Date:</span>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem' }}>{verifyData.date}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Not Found Details */}
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255, 107, 107, 0.1)', borderRadius: '8px', border: '2px solid #ff6b6b' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#ff6b6b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Detection
              </h3>
              <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.15rem' }}>Result</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#ff6b6b' }}>New seed detected</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                  <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Class:</span>
                  <div style={{ marginTop: '0.15rem', fontSize: '0.9rem', fontWeight: 'bold' }}>{verifyData.class}</div>
                </div>
                <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                  <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Confidence:</span>
                  <div style={{ marginTop: '0.15rem', fontSize: '0.9rem', fontWeight: 'bold', color: getConfidenceColor(verifyData.confidence) }}>{verifyData.confidence}%</div>
                </div>
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'rgba(255, 107, 107, 0.1)', borderRadius: '6px', border: '1px solid #ff6b6b', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#ff6b6b', fontWeight: 'bold', marginBottom: '0.35rem' }}>Warning</div>
              <div style={{ fontSize: '0.8rem', color: '#e0e0e0' }}>
                No matching record found in database. This seed may be uncertified or counterfeit.
              </div>
            </div>
          </>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
            border: `2px solid ${verifyData.status === 'certified' ? '#4caf50' : '#ff6b6b'}`,
            color: verifyData.status === 'certified' ? '#4caf50' : '#ff6b6b',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 'bold',
            borderRadius: '6px',
            transition: 'all 0.3s',
            textTransform: 'uppercase'
          }}
          onMouseEnter={(e) => {
            const color = verifyData.status === 'certified' ? '#4caf50' : '#ff6b6b';
            e.currentTarget.style.background = color;
            e.currentTarget.style.color = '#000';
          }}
          onMouseLeave={(e) => {
            const color = verifyData.status === 'certified' ? '#4caf50' : '#ff6b6b';
            e.currentTarget.style.background = 'linear-gradient(135deg, #2a2a2a, #1a1a1a)';
            e.currentTarget.style.color = color;
          }}
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
