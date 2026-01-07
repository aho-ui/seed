'use client';
import Modal from '../../../components/Modal';
import { API_URL } from '../../../../lib/config';
import { formatPercentage } from '../../../../utils/formatting';
import { getConfidenceColor } from '../../utils/helpers';

export default function SeedDetailModal({ seed, onClose }) {
  if (!seed) return null;

  return (
    <Modal onClose={onClose}>
      <div style={{ background: '#1a1a1a', padding: '1.5rem', borderRadius: '12px', maxWidth: '800px', width: '90vw', color: '#e0e0e0', maxHeight: '85vh', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: '1rem', borderBottom: '2px solid #4caf50', paddingBottom: '0.5rem', color: '#4caf50', fontSize: '1.4rem', textAlign: 'center' }}>
          Seed Analysis - #{seed.id}
        </h2>

        {/* Image Section */}
        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <img
            src={`${API_URL}${seed.image_url}`}
            alt={`Seed ${seed.id}`}
            style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '8px', border: '2px solid #333' }}
          />
        </div>

        {/* Primary Classification Info */}
        <div style={{ marginBottom: '1rem', padding: '1rem', background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.05))', borderRadius: '8px', border: '2px solid #4caf50' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#4caf50', borderBottom: '1px solid #4caf50', paddingBottom: '0.35rem' }}>Classification Results</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
            <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Seed ID</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#4caf50' }}>#{seed.id}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Classification</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{seed.class}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Confidence</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: getConfidenceColor(seed.confidence * 100) }}>
                {formatPercentage(seed.confidence)}
              </div>
            </div>
            {seed.quality && (
              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Quality</div>
                <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{seed.quality}</div>
              </div>
            )}
          </div>
        </div>

        {/* Bounding Box Coordinates */}
        {seed.bbox && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(42, 42, 42, 0.5)', borderRadius: '8px', border: '1px solid #666' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#4caf50', borderBottom: '1px solid #4caf50', paddingBottom: '0.35rem' }}>
              Bounding Box
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', borderLeft: '2px solid #4caf50' }}>
                <div style={{ fontSize: '0.65rem', color: '#aaa', marginBottom: '0.15rem' }}>X</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{seed.bbox[0].toFixed(0)}</div>
              </div>
              <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', borderLeft: '2px solid #4caf50' }}>
                <div style={{ fontSize: '0.65rem', color: '#aaa', marginBottom: '0.15rem' }}>Y</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{seed.bbox[1].toFixed(0)}</div>
              </div>
              <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', borderLeft: '2px solid #4caf50' }}>
                <div style={{ fontSize: '0.65rem', color: '#aaa', marginBottom: '0.15rem' }}>W</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{seed.bbox[2].toFixed(0)}</div>
              </div>
              <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', borderLeft: '2px solid #4caf50' }}>
                <div style={{ fontSize: '0.65rem', color: '#aaa', marginBottom: '0.15rem' }}>H</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{seed.bbox[3].toFixed(0)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Technical & Metadata Info */}
        <div style={{ padding: '0.75rem', background: 'rgba(42, 42, 42, 0.5)', borderRadius: '8px', border: '1px solid #666', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#4caf50', borderBottom: '1px solid #4caf50', paddingBottom: '0.35rem' }}>
            Technical Details
          </h3>
          <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
            {seed.image_url && (
              <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                <span style={{ color: '#aaa', fontWeight: 'bold' }}>Path:</span>
                <div style={{ marginTop: '0.15rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#4caf50' }}>{seed.image_url}</div>
              </div>
            )}
            {seed.uploaded_at && (
              <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                <span style={{ color: '#aaa', fontWeight: 'bold' }}>Uploaded:</span>
                <span style={{ marginLeft: '0.5rem', color: '#e0e0e0' }}>{new Date(seed.uploaded_at).toLocaleString()}</span>
              </div>
            )}
            <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
              <span style={{ color: '#aaa', fontWeight: 'bold' }}>Status:</span>
              <span style={{ marginLeft: '0.5rem', color: '#4caf50', fontWeight: 'bold' }}>Successfully Saved</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
            border: '2px solid #4caf50',
            color: '#4caf50',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 'bold',
            borderRadius: '6px',
            transition: 'all 0.3s',
            textTransform: 'uppercase'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#4caf50'; e.currentTarget.style.color = '#000'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #2a2a2a, #1a1a1a)'; e.currentTarget.style.color = '#4caf50'; }}
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
