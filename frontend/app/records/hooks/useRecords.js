import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../../lib/config';

export function useRecords() {
  const [records, setRecords] = useState([]);
  const [certifiers, setCertifiers] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

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
      setCertifiers(certifiersRes.data.signers);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoadingRecords(false);
    }
  };

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

  useEffect(() => {
    fetchData();
  }, []);

  return {
    records,
    certifiers,
    loadingRecords,
    refreshRecords
  };
}
