'use client';
import { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../../../lib/config';
import { getConfidenceColor } from '../../utils/helpers';

export default function CertifyTab({ records, certifiers, loadingRecords, refreshRecords, onRecordClick }) {
  const [selectedCertifier, setSelectedCertifier] = useState('');
  const [selectedBlockchain, setSelectedBlockchain] = useState('fabric');
  const [certifyMessage, setCertifyMessage] = useState('');
  const [certifyingId, setCertifyingId] = useState(null);
  const [certifyQueue, setCertifyQueue] = useState([]);
  const [queueProcessing, setQueueProcessing] = useState(false);
  const [queuedItems, setQueuedItems] = useState(new Set());

  const uncertifiedRecords = records.filter(r => r.blockchain_status === 'Not Certified');

  const isCertifySuccess = certifyMessage.toLowerCase().includes('certified successfully') ||
                           certifyMessage.toLowerCase().includes('added to queue') ||
                           certifyMessage.toLowerCase().includes('queue processing complete') ||
                           certifyMessage.toLowerCase().includes('queue cleared');

  const addToQueue = (recordId) => {
    if (!selectedCertifier) {
      setCertifyMessage('Please select a certifier');
      setTimeout(() => setCertifyMessage(''), 3000);
      return;
    }

    const queueItem = {
      id: recordId,
      certifier: selectedCertifier,
      blockchain: selectedBlockchain,
      status: 'queued'
    };

    setCertifyQueue(prev => [...prev, queueItem]);
    setQueuedItems(prev => new Set([...prev, recordId]));
    setCertifyMessage(`Seed #${recordId} added to queue`);
    setTimeout(() => setCertifyMessage(''), 2000);
  };

  const processCertifyQueue = async () => {
    if (queueProcessing || certifyQueue.length === 0) return;

    setQueueProcessing(true);

    for (let i = 0; i < certifyQueue.length; i++) {
      const item = certifyQueue[i];

      if (item.status !== 'queued') continue;

      setCertifyQueue(prev => {
        const updated = [...prev];
        updated[i] = { ...updated[i], status: 'processing' };
        return updated;
      });
      setCertifyingId(item.id);

      try {
        const formData = new FormData();
        formData.append('seed_id', item.id);
        formData.append('blockchain_type', item.blockchain);
        formData.append('signer_id', item.certifier);

        const res = await axios.post(`${API_URL}/api/certify/`, formData);

        if (res.data.success) {
          setCertifyQueue(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], status: 'completed' };
            return updated;
          });
          setCertifyMessage(`Seed #${item.id} certified successfully!`);
        } else {
          setCertifyQueue(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], status: 'failed' };
            return updated;
          });
        }
      } catch (err) {
        console.error('Certification failed:', err);
        setCertifyQueue(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: 'failed', error: err.response?.data?.error };
          return updated;
        });
      }

      setCertifyingId(null);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await refreshRecords();
    setCertifyQueue(prev => prev.filter(item => item.status === 'failed'));
    setQueuedItems(new Set());
    setQueueProcessing(false);
    setCertifyMessage('Queue processing complete!');
    setTimeout(() => setCertifyMessage(''), 3000);
  };

  const clearQueue = () => {
    setCertifyQueue([]);
    setQueuedItems(new Set());
    setCertifyMessage('Queue cleared');
    setTimeout(() => setCertifyMessage(''), 2000);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Certify Seeds on Blockchain</h2>

      {loadingRecords ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa' }}>
          Loading records...
        </div>
      ) : uncertifiedRecords.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa' }}>
          No uncertified seeds found. All seeds are already certified!
        </div>
      ) : (
        <>
          {/* Certifier Selection */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>Select Certifier/Nursery:</label>
            <select
              value={selectedCertifier}
              onChange={(e) => setSelectedCertifier(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#2a2a2a',
                border: '1px solid #333',
                color: '#e0e0e0',
                fontSize: '1rem'
              }}
            >
              <option value="">-- Select Certifier --</option>
              {certifiers.map(cert => (
                <option key={cert.id} value={cert.id}>{cert.name}</option>
              ))}
            </select>
          </div>

          {/* Blockchain Type Selection */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>Select Blockchain Type:</label>
            <select
              value={selectedBlockchain}
              onChange={(e) => setSelectedBlockchain(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#2a2a2a',
                border: '1px solid #333',
                color: '#e0e0e0',
                fontSize: '1rem'
              }}
            >
              <option value="fabric">Hyperledger Fabric</option>
              <option value="sawtooth">Hyperledger Sawtooth</option>
            </select>
          </div>

          {/* Queue Controls */}
          {certifyQueue.length > 0 && (
            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'rgba(74, 144, 226, 0.1)',
              border: '1px solid #4a90e2',
              borderRadius: '4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', color: '#4a90e2', margin: 0 }}>
                  Certification Queue ({certifyQueue.filter(i => i.status === 'queued').length} items)
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={processCertifyQueue}
                    disabled={queueProcessing}
                    style={{
                      padding: '0.5rem 1rem',
                      background: queueProcessing ? '#555' : '#4a90e2',
                      border: 'none',
                      color: '#fff',
                      cursor: queueProcessing ? 'not-allowed' : 'pointer',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  >
                    {queueProcessing ? 'Processing...' : 'Process Queue'}
                  </button>
                  <button
                    onClick={clearQueue}
                    disabled={queueProcessing}
                    style={{
                      padding: '0.5rem 1rem',
                      background: queueProcessing ? '#555' : '#ff6b6b',
                      border: 'none',
                      color: '#fff',
                      cursor: queueProcessing ? 'not-allowed' : 'pointer',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  >
                    Clear Queue
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                {certifyQueue.map((item, idx) => (
                  <span key={idx} style={{
                    display: 'inline-block',
                    marginRight: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    background: item.status === 'processing' ? '#4a90e2' :
                                item.status === 'completed' ? '#4caf50' :
                                item.status === 'failed' ? '#ff6b6b' : '#555',
                    borderRadius: '3px',
                    marginTop: '0.5rem'
                  }}>
                    #{item.id} ({item.status})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Success/Error Message */}
          {certifyMessage && (
            <div style={{
              padding: '1rem',
              background: isCertifySuccess ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 107, 107, 0.2)',
              border: `1px solid ${isCertifySuccess ? '#4caf50' : '#ff6b6b'}`,
              color: isCertifySuccess ? '#4caf50' : '#ff6b6b',
              marginBottom: '1.5rem',
              borderRadius: '4px'
            }}>
              {certifyMessage}
            </div>
          )}

          {/* Uncertified Seeds Table */}
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#aaa' }}>Uncertified Seeds:</h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(26, 26, 26, 0.5)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #333' }}>
                <th style={{ padding: '1rem', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.8rem', color: '#aaa' }}>ID</th>
                <th style={{ padding: '1rem', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.8rem', color: '#aaa' }}>Prediction</th>
                <th style={{ padding: '1rem', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.8rem', color: '#aaa' }}>Confidence</th>
                <th style={{ padding: '1rem', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.8rem', color: '#aaa' }}>Quality</th>
                <th style={{ padding: '1rem', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.8rem', color: '#aaa' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {uncertifiedRecords.map(record => (
                <tr
                  key={record.id}
                  style={{ borderBottom: '1px solid #2a2a2a', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(42, 42, 42, 0.7)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  onClick={() => onRecordClick(record)}
                >
                  <td style={{ padding: '1rem' }}>{record.id}</td>
                  <td style={{ padding: '1rem' }}>{record.prediction}</td>
                  <td style={{ padding: '1rem', color: getConfidenceColor(record.confidence * 100) }}>{(record.confidence * 100).toFixed(1)}%</td>
                  <td style={{ padding: '1rem' }}>{record.quality}</td>
                  <td style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      disabled={queuedItems.has(record.id) || certifyingId === record.id}
                      onClick={() => addToQueue(record.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: queuedItems.has(record.id) ? '#4a90e2' :
                                   certifyingId === record.id ? '#333' : '#4caf50',
                        border: 'none',
                        color: '#fff',
                        cursor: (queuedItems.has(record.id) || certifyingId === record.id) ? 'not-allowed' : 'pointer',
                        borderRadius: '4px',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        if (!queuedItems.has(record.id) && certifyingId !== record.id)
                          e.currentTarget.style.background = '#45a049';
                      }}
                      onMouseLeave={(e) => {
                        if (!queuedItems.has(record.id) && certifyingId !== record.id)
                          e.currentTarget.style.background = '#4caf50';
                      }}
                    >
                      {queuedItems.has(record.id) ? 'Queued' :
                       certifyingId === record.id ? 'Processing' : 'Add to Queue'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
