'use client';
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import { API_URL } from '../../lib/config';
import { formatPercentage } from '../../utils/formatting';

export default function RecordsPage() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'view', 'certify', or 'verify'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Records data from API
  const [records, setRecords] = useState([]);
  const [certifiers, setCertifiers] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  // Upload tab state
  const [file, setFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [enlargedImage, setEnlargedImage] = useState(null);

  // Certify tab state
  const [selectedCertifier, setSelectedCertifier] = useState('');
  const [selectedBlockchain, setSelectedBlockchain] = useState('fabric');
  const [certifyMessage, setCertifyMessage] = useState('');
  const [certifyingId, setCertifyingId] = useState(null);

  // Certification Queue state
  const [certifyQueue, setCertifyQueue] = useState([]);
  const [queueProcessing, setQueueProcessing] = useState(false);
  const [queuedItems, setQueuedItems] = useState(new Set());

  // Verify tab state
  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyPreview, setVerifyPreview] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Detail modal state
  const [detailModalSeed, setDetailModalSeed] = useState(null); // For upload seed details
  const [detailModalRecord, setDetailModalRecord] = useState(null); // For certify record details
  const [detailModalVerify, setDetailModalVerify] = useState(null); // For verify result details

  // Refs for scrolling
  const uploadResultsRef = useRef(null);

  // Auto-scroll to results when upload completes
  useEffect(() => {
    if (uploadResult && uploadResultsRef.current) {
      uploadResultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [uploadResult]);

  // Fetch records from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingRecords(true);

        // Fetch records
        const recordsRes = await axios.get(`${API_URL}/api/database/`);
        const recordsData = recordsRes.data.records.map(r => ({
          id: r.id,
          prediction: r.prediction,
          confidence: r.confidence,
          quality: r.quality,
          blockchain_status: r.blockchain_synced ? 'Certified' : 'Not Certified',
          blockchain_type: r.blockchain_type,
          certifier: r.signer_name,
          tx_id: r.blockchain_tx_id,
          created_at: r.uploaded_at,
          image_url: r.image_url
        }));
        setRecords(recordsData);

        // Fetch certifiers
        const certifiersRes = await axios.get(`${API_URL}/api/signers/`);
        // Backend returns array of {id, name} objects
        setCertifiers(certifiersRes.data.signers);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingRecords(false);
      }
    };

    fetchData();
  }, []);

  // Refresh records after upload or certification
  const refreshRecords = async () => {
    try {
      const recordsRes = await axios.get(`${API_URL}/api/database/`);
      const recordsData = recordsRes.data.records.map(r => ({
        id: r.id,
        prediction: r.prediction,
        confidence: r.confidence,
        quality: r.quality,
        blockchain_status: r.blockchain_synced ? 'Certified' : 'Not Certified',
        blockchain_type: r.blockchain_type,
        certifier: r.signer_name,
        tx_id: r.blockchain_tx_id,
        created_at: r.uploaded_at,
        image_url: r.image_url
      }));
      setRecords(recordsData);
    } catch (error) {
      console.error('Error refreshing records:', error);
    }
  };

  // Pagination
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = records.slice(startIndex, startIndex + itemsPerPage);
  const uncertifiedRecords = records.filter(r => r.blockchain_status === 'Not Certified');

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return '#4caf50';
    if (confidence >= 70) return '#ff9800';
    return '#ff6b6b';
  };

  const getConfidenceClass = (confidence) => {
    const conf = confidence * 100;
    if (conf >= 90) return 'confidence-high';
    if (conf >= 70) return 'confidence-medium';
    return 'confidence-low';
  };

  // Upload handlers
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

      // Refresh records list
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

  // Add record to certification queue
  const addToQueue = (recordId) => {
    if (!selectedCertifier) {
      setCertifyMessage('Please select a certifier');
      setTimeout(() => setCertifyMessage(''), 3000);
      return;
    }

    // Add to queue with current certifier and blockchain settings
    const queueItem = {
      id: recordId,
      certifier: selectedCertifier,
      blockchain: selectedBlockchain,
      status: 'queued' // queued, processing, completed, failed
    };

    setCertifyQueue(prev => [...prev, queueItem]);
    setQueuedItems(prev => new Set([...prev, recordId]));
    setCertifyMessage(`Seed #${recordId} added to queue`);
    setTimeout(() => setCertifyMessage(''), 2000);
  };

  // Process the certification queue
  const processCertifyQueue = async () => {
    if (queueProcessing || certifyQueue.length === 0) return;

    setQueueProcessing(true);

    // Process queue items one by one
    for (let i = 0; i < certifyQueue.length; i++) {
      const item = certifyQueue[i];

      if (item.status !== 'queued') continue;

      // Mark as processing
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
          // Mark as completed
          setCertifyQueue(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], status: 'completed' };
            return updated;
          });
          setCertifyMessage(`Seed #${item.id} certified successfully!`);
        } else {
          // Mark as failed
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

      // Small delay between certifications
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Refresh records after all processing
    await refreshRecords();

    // Remove completed items from queue
    setCertifyQueue(prev => prev.filter(item => item.status === 'failed'));
    setQueuedItems(new Set());
    setQueueProcessing(false);
    setCertifyMessage('Queue processing complete!');
    setTimeout(() => setCertifyMessage(''), 3000);
  };

  // Clear the queue
  const clearQueue = () => {
    setCertifyQueue([]);
    setQueuedItems(new Set());
    setCertifyMessage('Queue cleared');
    setTimeout(() => setCertifyMessage(''), 2000);
  };

  const handleCertify = async (recordId) => {
    if (certifyingId) return;

    if (!selectedCertifier) {
      setCertifyMessage('Please select a certifier');
      return;
    }

    setCertifyingId(recordId);

    try {
      const formData = new FormData();
      formData.append('seed_id', recordId);
      formData.append('blockchain_type', selectedBlockchain);
      formData.append('signer_id', selectedCertifier);

      const res = await axios.post(`${API_URL}/api/certify/`, formData);

      if (res.data.success) {
        setCertifyMessage(`Seed #${recordId} certified successfully on ${res.data.blockchain_type}!`);

        // Refresh records list
        await refreshRecords();
      } else {
        setCertifyMessage('Certification failed');
      }
    } catch (err) {
      console.error('Certification failed:', err);
      setCertifyMessage(err.response?.data?.error || 'Certification failed');
    }

    setCertifyingId(null);
    setTimeout(() => setCertifyMessage(''), 5000);
  };

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

  const isCertifySuccess = certifyMessage.toLowerCase().includes('certified successfully') ||
                           certifyMessage.toLowerCase().includes('added to queue') ||
                           certifyMessage.toLowerCase().includes('queue processing complete') ||
                           certifyMessage.toLowerCase().includes('queue cleared');

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', background: 'linear-gradient(to bottom, #0a0a0a, #1a1a1a)', color: '#e0e0e0' }}>
      <h1 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '2rem' }}>Seed Records Management</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('upload')}
          style={{
            padding: '0.75rem 2rem',
            background: activeTab === 'upload' ? '#2a2a2a' : 'transparent',
            border: `2px solid ${activeTab === 'upload' ? '#4caf50' : '#333'}`,
            color: activeTab === 'upload' ? '#4caf50' : '#aaa',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'upload' ? 'bold' : 'normal',
            transition: 'all 0.3s'
          }}
        >
          Upload
        </button>
        <button
          onClick={() => setActiveTab('view')}
          style={{
            padding: '0.75rem 2rem',
            background: activeTab === 'view' ? '#2a2a2a' : 'transparent',
            border: `2px solid ${activeTab === 'view' ? '#4caf50' : '#333'}`,
            color: activeTab === 'view' ? '#4caf50' : '#aaa',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'view' ? 'bold' : 'normal',
            transition: 'all 0.3s'
          }}
        >
          View Records
        </button>
        <button
          onClick={() => setActiveTab('certify')}
          style={{
            padding: '0.75rem 2rem',
            background: activeTab === 'certify' ? '#2a2a2a' : 'transparent',
            border: `2px solid ${activeTab === 'certify' ? '#4caf50' : '#333'}`,
            color: activeTab === 'certify' ? '#4caf50' : '#aaa',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'certify' ? 'bold' : 'normal',
            transition: 'all 0.3s'
          }}
        >
          Certify Seeds
        </button>
        <button
          onClick={() => setActiveTab('verify')}
          style={{
            padding: '0.75rem 2rem',
            background: activeTab === 'verify' ? '#2a2a2a' : 'transparent',
            border: `2px solid ${activeTab === 'verify' ? '#4caf50' : '#333'}`,
            color: activeTab === 'verify' ? '#4caf50' : '#aaa',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'verify' ? 'bold' : 'normal',
            transition: 'all 0.3s'
          }}
        >
          Verify Seeds
        </button>
      </div>

      {/* TAB 0: UPLOAD & CLASSIFY */}
      {activeTab === 'upload' && (
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
                        onClick={() => seed.status === 'saved' && setDetailModalSeed(seed)}
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
      )}

      {/* TAB 1: VIEW RECORDS */}
      {activeTab === 'view' && (
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
                  onClick={() => setSelectedRecord(record)}
                  style={{
                    background: 'rgba(42, 42, 42, 0.5)',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    gap: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    ':hover': { transform: 'translateY(-2px)' }
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#4caf50'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#333'; }}
                >
                  <div style={{ width: '120px', height: '120px', background: '#1a1a1a', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', overflow: 'hidden' }}>
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
                      onClick={() => setSelectedRecord(record)}
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
      )}

      {/* TAB 2: CERTIFY */}
      {activeTab === 'certify' && (
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

          {uncertifiedRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              No uncertified seeds found.
            </div>
          ) : (
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
                    onClick={() => setDetailModalRecord(record)}
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
          )}
            </>
          )}
        </div>
      )}

      {/* TAB 4: VERIFY SEEDS */}
      {activeTab === 'verify' && (
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
                        onClick={() => setEnlargedImage(`data:image/jpeg;base64,${verifyResult.annotated_image}`)}
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
                            // Find blockchain data
                            const certifiedBlockchain = Object.entries(verification.blockchains || {}).find(([name, data]) => data.certified);
                            if (certifiedBlockchain) {
                              const [bcName, bcData] = certifiedBlockchain;
                              setDetailModalVerify({
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
                            setDetailModalVerify({
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
      )}

      {/* Modal for detailed view */}
      {selectedRecord && (
        <Modal onClose={() => setSelectedRecord(null)}>
          <div style={{ background: '#1a1a1a', padding: '2rem', borderRadius: '8px', maxWidth: '600px', color: '#e0e0e0' }}>
            <h2 style={{ marginBottom: '1.5rem', borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>
              Seed Details - ID: {selectedRecord.id}
            </h2>
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '200px', height: '200px', background: '#0a0a0a', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', overflow: 'hidden' }}>
                {selectedRecord.image_url ? (
                  <img
                    src={`${API_URL}${selectedRecord.image_url}`}
                    alt={`Seed ${selectedRecord.id}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
                  />
                ) : (
                  <span style={{ color: '#555' }}>[No Image]</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '0.75rem' }}><strong>Prediction:</strong> {selectedRecord.prediction}</div>
                <div style={{ marginBottom: '0.75rem' }}><strong>Confidence:</strong> <span style={{ color: getConfidenceColor(selectedRecord.confidence * 100) }}>{(selectedRecord.confidence * 100).toFixed(1)}%</span></div>
                <div style={{ marginBottom: '0.75rem' }}><strong>Quality:</strong> {selectedRecord.quality}</div>
                <div style={{ marginBottom: '0.75rem' }}><strong>Blockchain:</strong> <span style={{ color: selectedRecord.blockchain_status === 'Certified' ? '#4caf50' : '#ff9800' }}>{selectedRecord.blockchain_status}</span></div>
                {selectedRecord.blockchain_type && (
                  <>
                    <div style={{ marginBottom: '0.75rem' }}><strong>Type:</strong> {selectedRecord.blockchain_type}</div>
                    <div style={{ marginBottom: '0.75rem' }}><strong>Certifier:</strong> {selectedRecord.certifier}</div>
                    <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}><strong>TX:</strong> <span style={{ color: '#666', wordBreak: 'break-all' }}>{selectedRecord.tx_id}</span></div>
                  </>
                )}
                <div style={{ marginBottom: '0.75rem' }}><strong>Date:</strong> {formatDate(selectedRecord.created_at)}</div>
              </div>
            </div>
            <button
              onClick={() => setSelectedRecord(null)}
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
      )}

      {/* Modal for enlarged upload images */}
      {enlargedImage && (
        <Modal onClose={() => setEnlargedImage(null)}>
          <img
            src={enlargedImage}
            alt="Enlarged seed"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px' }}
          />
        </Modal>
      )}

      {/* Detailed Seed Modal (Upload Tab) - Comprehensive View */}
      {detailModalSeed && (
        <Modal onClose={() => setDetailModalSeed(null)}>
          <div style={{ background: '#1a1a1a', padding: '1.5rem', borderRadius: '12px', maxWidth: '800px', width: '90vw', color: '#e0e0e0', maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1rem', borderBottom: '2px solid #4caf50', paddingBottom: '0.5rem', color: '#4caf50', fontSize: '1.4rem', textAlign: 'center' }}>
              Seed Analysis - #{detailModalSeed.id}
            </h2>

            {/* Image Section - Full Width */}
            <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
              <img
                src={`${API_URL}${detailModalSeed.image_url}`}
                alt={`Seed ${detailModalSeed.id}`}
                style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '8px', border: '2px solid #333' }}
              />
            </div>

            {/* Primary Classification Info */}
            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.05))', borderRadius: '8px', border: '2px solid #4caf50' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#4caf50', borderBottom: '1px solid #4caf50', paddingBottom: '0.35rem' }}>Classification Results</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Seed ID</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#4caf50' }}>#{detailModalSeed.id}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Classification</div>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{detailModalSeed.class}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Confidence</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: getConfidenceColor(detailModalSeed.confidence * 100) }}>
                    {formatPercentage(detailModalSeed.confidence)}
                  </div>
                </div>
                {detailModalSeed.quality && (
                  <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Quality</div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{detailModalSeed.quality}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Bounding Box Coordinates */}
            {detailModalSeed.bbox && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(42, 42, 42, 0.5)', borderRadius: '8px', border: '1px solid #666' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#4caf50', borderBottom: '1px solid #4caf50', paddingBottom: '0.35rem' }}>
                  Bounding Box
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', borderLeft: '2px solid #4caf50' }}>
                    <div style={{ fontSize: '0.65rem', color: '#aaa', marginBottom: '0.15rem' }}>X</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{detailModalSeed.bbox[0].toFixed(0)}</div>
                  </div>
                  <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', borderLeft: '2px solid #4caf50' }}>
                    <div style={{ fontSize: '0.65rem', color: '#aaa', marginBottom: '0.15rem' }}>Y</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{detailModalSeed.bbox[1].toFixed(0)}</div>
                  </div>
                  <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', borderLeft: '2px solid #ff9800' }}>
                    <div style={{ fontSize: '0.65rem', color: '#aaa', marginBottom: '0.15rem' }}>W</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{detailModalSeed.bbox[2].toFixed(0)}</div>
                  </div>
                  <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', borderLeft: '2px solid #ff9800' }}>
                    <div style={{ fontSize: '0.65rem', color: '#aaa', marginBottom: '0.15rem' }}>H</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{detailModalSeed.bbox[3].toFixed(0)}</div>
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
                {detailModalSeed.image_url && (
                  <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                    <span style={{ color: '#aaa', fontWeight: 'bold' }}>Path:</span>
                    <div style={{ marginTop: '0.15rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#4caf50' }}>{detailModalSeed.image_url}</div>
                  </div>
                )}
                {detailModalSeed.uploaded_at && (
                  <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                    <span style={{ color: '#aaa', fontWeight: 'bold' }}>Uploaded:</span>
                    <span style={{ marginLeft: '0.5rem', color: '#e0e0e0' }}>{new Date(detailModalSeed.uploaded_at).toLocaleString()}</span>
                  </div>
                )}
                <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                  <span style={{ color: '#aaa', fontWeight: 'bold' }}>Status:</span>
                  <span style={{ marginLeft: '0.5rem', color: '#4caf50', fontWeight: 'bold' }}>Successfully Saved</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setDetailModalSeed(null)}
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
      )}

      {/* Detailed Record Modal (Certify Tab) */}
      {detailModalRecord && (
        <Modal onClose={() => setDetailModalRecord(null)}>
          <div style={{ maxWidth: '800px', width: '90vw', maxHeight: '85vh', overflowY: 'auto', background: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)', padding: '1.5rem', borderRadius: '12px', color: '#e0e0e0' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#4caf50', marginBottom: '0.5rem' }}>
              Record Analysis - #{detailModalRecord.id}
            </h2>
            <div style={{ color: '#666', fontSize: '0.8rem', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
              Blockchain certification details
            </div>

            {/* Image Display (if available) */}
            {detailModalRecord.image_url && (
              <div style={{ marginBottom: '1rem', textAlign: 'center', background: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Image
                </h3>
                <img
                  src={`${API_URL}${detailModalRecord.image_url}`}
                  alt={`Record ${detailModalRecord.id}`}
                  style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '2px solid #333' }}
                />
              </div>
            )}

            {/* Classification Results - Large Metrics */}
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Classification
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05))', borderRadius: '8px', border: '2px solid rgba(76, 175, 80, 0.3)' }}>
                  <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.25rem', textTransform: 'uppercase' }}>ID</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#4caf50' }}>#{detailModalRecord.id}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05))', borderRadius: '8px', border: '2px solid rgba(76, 175, 80, 0.3)' }}>
                  <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Type</div>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4caf50' }}>{detailModalRecord.prediction}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1), rgba(255, 152, 0, 0.05))', borderRadius: '8px', border: '2px solid rgba(255, 152, 0, 0.3)' }}>
                  <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Confidence</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: getConfidenceColor(detailModalRecord.confidence * 100) }}>{(detailModalRecord.confidence * 100).toFixed(1)}%</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.1), rgba(33, 150, 243, 0.05))', borderRadius: '8px', border: '2px solid rgba(33, 150, 243, 0.3)' }}>
                  <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Quality</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#2196f3' }}>{detailModalRecord.quality}</div>
                </div>
              </div>
            </div>

            {/* Blockchain Certification Details */}
            {detailModalRecord.blockchain_type && (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Blockchain Certification
                </h3>
                <div style={{ background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.05))', borderRadius: '8px', border: '2px solid #4caf50', padding: '0.75rem' }}>
                  <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', borderLeft: '2px solid #4caf50' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.15rem' }}>Status</div>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4caf50' }}>
                          {detailModalRecord.blockchain_status}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                        <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Type:</span>
                        <div style={{ marginTop: '0.15rem', fontSize: '0.9rem', fontWeight: 'bold', color: '#4caf50' }}>{detailModalRecord.blockchain_type}</div>
                      </div>
                      <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                        <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Certifier:</span>
                        <div style={{ marginTop: '0.15rem', fontSize: '0.9rem', fontWeight: 'bold', color: '#e0e0e0' }}>{detailModalRecord.certifier}</div>
                      </div>
                    </div>
                    <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                      <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Transaction ID:</span>
                      <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', fontFamily: 'monospace', color: '#4caf50', wordBreak: 'break-all' }}>
                        {detailModalRecord.tx_id}
                      </div>
                    </div>
                    <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                      <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Date:</span>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#e0e0e0' }}>
                        {formatDate(detailModalRecord.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setDetailModalRecord(null)}
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
      )}

      {/* Detailed Verify Modal */}
      {detailModalVerify && (
        <Modal onClose={() => setDetailModalVerify(null)}>
          <div style={{ maxWidth: '700px', width: '90vw', maxHeight: '85vh', overflowY: 'auto', background: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)', padding: '1.5rem', borderRadius: '12px', color: '#e0e0e0' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '0.5rem', color: detailModalVerify.status === 'certified' ? '#4caf50' : '#ff6b6b' }}>
              {detailModalVerify.status === 'certified' ? 'CERTIFIED SEED' : 'SEED NOT FOUND'}
            </h2>
            <div style={{ color: '#666', fontSize: '0.8rem', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
              Verification result
            </div>

            {detailModalVerify.status === 'certified' ? (
              <>
                {/* Verification Status */}
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.05))', borderRadius: '8px', border: '2px solid #4caf50' }}>
                  <h3 style={{ fontSize: '0.9rem', color: '#4caf50', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    Verification
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.15rem' }}>Matched ID</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4caf50' }}>#{detailModalVerify.seed_id}</div>
                    </div>
                    <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.15rem' }}>Similarity</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4caf50' }}>{detailModalVerify.similarity}%</div>
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
                      <div style={{ marginTop: '0.15rem', fontSize: '0.9rem', fontWeight: 'bold' }}>{detailModalVerify.class}</div>
                    </div>
                    <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                      <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Confidence:</span>
                      <div style={{ marginTop: '0.15rem', fontSize: '0.9rem', fontWeight: 'bold', color: getConfidenceColor(detailModalVerify.confidence) }}>{detailModalVerify.confidence}%</div>
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
                        <div style={{ marginTop: '0.15rem', fontSize: '0.9rem', fontWeight: 'bold', color: '#4caf50' }}>{detailModalVerify.blockchain}</div>
                      </div>
                      <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                        <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Certifier:</span>
                        <div style={{ marginTop: '0.15rem', fontSize: '0.9rem', fontWeight: 'bold' }}>{detailModalVerify.certifier}</div>
                      </div>
                    </div>
                    <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                      <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>TX ID:</span>
                      <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', fontFamily: 'monospace', color: '#4caf50', wordBreak: 'break-all' }}>{detailModalVerify.tx_id}</div>
                    </div>
                    <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                      <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Date:</span>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem' }}>{detailModalVerify.date}</span>
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
                      <div style={{ marginTop: '0.15rem', fontSize: '0.9rem', fontWeight: 'bold' }}>{detailModalVerify.class}</div>
                    </div>
                    <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                      <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Confidence:</span>
                      <div style={{ marginTop: '0.15rem', fontSize: '0.9rem', fontWeight: 'bold', color: getConfidenceColor(detailModalVerify.confidence) }}>{detailModalVerify.confidence}%</div>
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
              onClick={() => setDetailModalVerify(null)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
                border: `2px solid ${detailModalVerify.status === 'certified' ? '#4caf50' : '#ff6b6b'}`,
                color: detailModalVerify.status === 'certified' ? '#4caf50' : '#ff6b6b',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 'bold',
                borderRadius: '6px',
                transition: 'all 0.3s',
                textTransform: 'uppercase'
              }}
              onMouseEnter={(e) => {
                const color = detailModalVerify.status === 'certified' ? '#4caf50' : '#ff6b6b';
                e.currentTarget.style.background = color;
                e.currentTarget.style.color = '#000';
              }}
              onMouseLeave={(e) => {
                const color = detailModalVerify.status === 'certified' ? '#4caf50' : '#ff6b6b';
                e.currentTarget.style.background = 'linear-gradient(135deg, #2a2a2a, #1a1a1a)';
                e.currentTarget.style.color = color;
              }}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
