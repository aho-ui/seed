'use client';
import Modal from '../../../components/Modal';
import { API_URL } from '../../../../lib/config';
import { formatDate, getConfidenceColor } from '../../utils/helpers';

export default function RecordDetailModal({ record, onClose }) {
  if (!record) return null;

  return (
    <Modal onClose={onClose}>
      <div style={{ background: '#1a1a1a', padding: '2rem', borderRadius: '8px', maxWidth: '600px', color: '#e0e0e0' }}>
        <h2 style={{ marginBottom: '1.5rem', borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>
          Seed Details - ID: {record.id}
        </h2>
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '200px', height: '200px', background: '#0a0a0a', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {record.image_url ? (
              <img
                src={`${API_URL}${record.image_url}`}
                alt={`Seed ${record.id}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
              />
            ) : (
              <span style={{ color: '#555' }}>[No Image]</span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '0.75rem' }}><strong>Prediction:</strong> {record.prediction}</div>
            <div style={{ marginBottom: '0.75rem' }}><strong>Confidence:</strong> <span style={{ color: getConfidenceColor(record.confidence * 100) }}>{(record.confidence * 100).toFixed(1)}%</span></div>
            <div style={{ marginBottom: '0.75rem' }}><strong>Quality:</strong> {record.quality}</div>
            <div style={{ marginBottom: '0.75rem' }}><strong>Blockchain:</strong> <span style={{ color: record.blockchain_status === 'Certified' ? '#4caf50' : '#ff9800' }}>{record.blockchain_status}</span></div>
            {record.blockchain_type && (
              <>
                <div style={{ marginBottom: '0.75rem' }}><strong>Type:</strong> {record.blockchain_type}</div>
                <div style={{ marginBottom: '0.75rem' }}><strong>Certifier:</strong> {record.certifier}</div>
                <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}><strong>TX:</strong> <span style={{ color: '#666', wordBreak: 'break-all' }}>{record.tx_id}</span></div>
              </>
            )}
            <div style={{ marginBottom: '0.75rem' }}><strong>Date:</strong> {formatDate(record.created_at)}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#2a2a2a',
            border: '1px solid #333',
            color: '#e0e0e0',
            cursor: 'pointer',
            fontSize: '1rem',
            borderRadius: '4px',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#333'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#2a2a2a'; }}
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
