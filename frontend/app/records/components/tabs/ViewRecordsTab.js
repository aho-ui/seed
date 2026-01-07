'use client';
import { useState } from 'react';
import { API_URL } from '../../../../lib/config';
import { formatDate, getConfidenceColor } from '../../utils/helpers';

export default function ViewRecordsTab({ records, loadingRecords, onRecordClick }) {
  const [viewMode, setViewMode] = useState('cards');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const totalPages = Math.ceil(records.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = records.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div>
      {loadingRecords ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa' }}>
          Loading records...
        </div>
      ) : records.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa' }}>
          No records found. Upload some seeds first!
        </div>
      ) : (
        <>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                padding: '0.5rem 1.5rem',
                background: viewMode === 'cards' ? '#333' : 'transparent',
                border: '1px solid #444',
                color: viewMode === 'cards' ? '#e0e0e0' : '#aaa',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              Card View
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '0.5rem 1.5rem',
                background: viewMode === 'table' ? '#333' : 'transparent',
                border: '1px solid #444',
                color: viewMode === 'table' ? '#e0e0e0' : '#aaa',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              Table View
            </button>
          </div>

          {/* Items per page selector */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <span style={{ color: '#aaa' }}>Items per page:</span>
            {[5, 15, 25, 50].map(num => (
              <button
                key={num}
                onClick={() => {
                  setItemsPerPage(num);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.25rem 0.75rem',
                  background: itemsPerPage === num ? '#4caf50' : '#2a2a2a',
                  border: '1px solid #333',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {num}
              </button>
            ))}
          </div>

          {/* CARD VIEW */}
          {viewMode === 'cards' && (
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              {paginatedRecords.map(record => (
                <div
                  key={record.id}
                  onClick={() => onRecordClick(record)}
                  style={{
                    background: 'rgba(42, 42, 42, 0.5)',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    gap: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#4caf50'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#333'; }}
                >
                  <div style={{ width: '120px', height: '120px', background: '#1a1a1a', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
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
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      {record.prediction}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <div><span style={{ color: '#aaa' }}>Confidence:</span> <span style={{ color: getConfidenceColor(record.confidence * 100) }}>{(record.confidence * 100).toFixed(1)}%</span></div>
                      <div><span style={{ color: '#aaa' }}>Quality:</span> {record.quality}</div>
                      <div><span style={{ color: '#aaa' }}>Status:</span> <span style={{ color: record.blockchain_status === 'Certified' ? '#4caf50' : '#ff9800' }}>{record.blockchain_status}</span></div>
                      <div><span style={{ color: '#aaa' }}>Date:</span> {formatDate(record.created_at)}</div>
                      {record.blockchain_type && (
                        <>
                          <div><span style={{ color: '#aaa' }}>Blockchain:</span> {record.blockchain_type}</div>
                          <div><span style={{ color: '#aaa' }}>Certifier:</span> {record.certifier}</div>
                        </>
                      )}
                    </div>
                    {record.tx_id && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                        TX: {record.tx_id}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TABLE VIEW */}
          {viewMode === 'table' && (
            <div style={{ maxWidth: '1400px', margin: '0 auto', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(26, 26, 26, 0.5)' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #333' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.8rem', color: '#aaa' }}>ID</th>
                    <th style={{ padding: '1rem', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.8rem', color: '#aaa' }}>Prediction</th>
                    <th style={{ padding: '1rem', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.8rem', color: '#aaa' }}>Conf%</th>
                    <th style={{ padding: '1rem', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.8rem', color: '#aaa' }}>Quality</th>
                    <th style={{ padding: '1rem', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.8rem', color: '#aaa' }}>Blockchain</th>
                    <th style={{ padding: '1rem', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.8rem', color: '#aaa' }}>Type</th>
                    <th style={{ padding: '1rem', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.8rem', color: '#aaa' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map(record => (
                    <tr
                      key={record.id}
                      onClick={() => onRecordClick(record)}
                      style={{ borderBottom: '1px solid #2a2a2a', cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(42, 42, 42, 0.7)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '1rem' }}>{record.id}</td>
                      <td style={{ padding: '1rem' }}>{record.prediction}</td>
                      <td style={{ padding: '1rem', color: getConfidenceColor(record.confidence * 100) }}>{(record.confidence * 100).toFixed(1)}%</td>
                      <td style={{ padding: '1rem' }}>{record.quality}</td>
                      <td style={{ padding: '1rem', color: record.blockchain_status === 'Certified' ? '#4caf50' : '#ff9800' }}>{record.blockchain_status}</td>
                      <td style={{ padding: '1rem' }}>{record.blockchain_type || '-'}</td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{new Date(record.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '0.5rem 1rem',
                background: '#2a2a2a',
                border: '1px solid #333',
                color: currentPage === 1 ? '#555' : '#e0e0e0',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            <span style={{ color: '#aaa' }}>Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '0.5rem 1rem',
                background: '#2a2a2a',
                border: '1px solid #333',
                color: currentPage === totalPages ? '#555' : '#e0e0e0',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
