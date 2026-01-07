'use client';
import { useState } from 'react';
import Modal from '../components/Modal';
import { useRecords } from './hooks/useRecords';
import UploadTab from './components/tabs/UploadTab';
import ViewRecordsTab from './components/tabs/ViewRecordsTab';
import CertifyTab from './components/tabs/CertifyTab';
import VerifyTab from './components/tabs/VerifyTab';
import SeedDetailModal from './components/modals/SeedDetailModal';
import RecordDetailModal from './components/modals/RecordDetailModal';
import VerifyDetailModal from './components/modals/VerifyDetailModal';

export default function RecordsPage() {
  const [activeTab, setActiveTab] = useState('upload');
  const { records, certifiers, loadingRecords, refreshRecords } = useRecords();

  // Modal states
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [detailModalSeed, setDetailModalSeed] = useState(null);
  const [detailModalVerify, setDetailModalVerify] = useState(null);

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', background: 'linear-gradient(to bottom, #0a0a0a, #1a1a1a)', color: '#e0e0e0' }}>
      <h1 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '2rem' }}>Seed Records Management</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {['upload', 'view', 'certify', 'verify'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.75rem 2rem',
              background: activeTab === tab ? '#2a2a2a' : 'transparent',
              border: `2px solid ${activeTab === tab ? '#4caf50' : '#333'}`,
              color: activeTab === tab ? '#4caf50' : '#aaa',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              transition: 'all 0.3s'
            }}
          >
            {tab === 'upload' && 'Upload'}
            {tab === 'view' && 'View Records'}
            {tab === 'certify' && 'Certify Seeds'}
            {tab === 'verify' && 'Verify Seeds'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'upload' && (
        <UploadTab
          refreshRecords={refreshRecords}
          onSeedDetailClick={setDetailModalSeed}
        />
      )}

      {activeTab === 'view' && (
        <ViewRecordsTab
          records={records}
          loadingRecords={loadingRecords}
          onRecordClick={setSelectedRecord}
        />
      )}

      {activeTab === 'certify' && (
        <CertifyTab
          records={records}
          certifiers={certifiers}
          loadingRecords={loadingRecords}
          refreshRecords={refreshRecords}
          onRecordClick={setSelectedRecord}
        />
      )}

      {activeTab === 'verify' && (
        <VerifyTab
          onVerifyDetailClick={setDetailModalVerify}
          onImageEnlarge={setEnlargedImage}
        />
      )}

      {/* Modals */}
      <RecordDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      <SeedDetailModal seed={detailModalSeed} onClose={() => setDetailModalSeed(null)} />
      <VerifyDetailModal verifyData={detailModalVerify} onClose={() => setDetailModalVerify(null)} />

      {/* Enlarged Image Modal */}
      {enlargedImage && (
        <Modal onClose={() => setEnlargedImage(null)}>
          <img
            src={enlargedImage}
            alt="Enlarged seed"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px' }}
          />
        </Modal>
      )}
    </div>
  );
}
