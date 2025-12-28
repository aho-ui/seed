'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import Nav from '../components/Nav'
import { API_URL } from '../../lib/config'
import { formatPercentage } from '../../utils/formatting'

export default function Certify() {
  const [seeds, setSeeds] = useState([])
  const [signers, setSigners] = useState([])
  const [selectedSigner, setSelectedSigner] = useState('')
  const [selectedBlockchain, setSelectedBlockchain] = useState('fabric')
  const [loading, setLoading] = useState(true)
  const [certifying, setCertifying] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    // Fetch seeds and signers
    Promise.all([
      axios.get(`${API_URL}/api/database/`),
      axios.get(`${API_URL}/api/signers/`)
    ])
      .then(([seedsRes, signersRes]) => {
        setSeeds(seedsRes.data.records)
        setSigners(signersRes.data.signers)
        // Set default signer
        if (signersRes.data.signers.length > 0) {
          setSelectedSigner(signersRes.data.signers[0].id)
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const handleCertify = async (seedId) => {
    if (!selectedSigner) {
      setResult({ success: false, error: 'Please select a signer' })
      return
    }

    setCertifying(seedId)
    setResult(null)

    const formData = new FormData()
    formData.append('seed_id', seedId)
    formData.append('signer_id', selectedSigner)
    formData.append('blockchain_type', selectedBlockchain)

    try {
      const res = await axios.post(`${API_URL}/api/certify/`, formData)
      setResult({ success: true, data: res.data })
      // Refresh list
      const updated = await axios.get(`${API_URL}/api/database/`)
      setSeeds(updated.data.records)
    } catch (err) {
      setResult({ success: false, error: err.response?.data?.error || err.message })
    } finally {
      setCertifying(null)
    }
  }

  return (
    <>
      <Nav />
      <div className="container">
        <h1>Certify Seeds on Blockchain</h1>

        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(17, 17, 17, 0.8)', border: '2px solid #333', borderRadius: '12px' }}>
          <label htmlFor="signer" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#bbb', fontSize: '0.95rem' }}>
            Select Certifier/Nursery:
          </label>
          <select
            id="signer"
            value={selectedSigner}
            onChange={(e) => setSelectedSigner(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '0.95rem',
              borderRadius: '8px',
              border: '2px solid #333',
              backgroundColor: 'rgba(17, 17, 17, 0.8)',
              color: '#e0e0e0',
              cursor: 'pointer',
              marginBottom: '15px'
            }}
          >
            {signers.map(signer => (
              <option key={signer.id} value={signer.id}>
                {signer.name}
              </option>
            ))}
          </select>

          <label htmlFor="blockchain" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#bbb', fontSize: '0.95rem' }}>
            Select Blockchain:
          </label>
          <select
            id="blockchain"
            value={selectedBlockchain}
            onChange={(e) => setSelectedBlockchain(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '0.95rem',
              borderRadius: '8px',
              border: '2px solid #333',
              backgroundColor: 'rgba(17, 17, 17, 0.8)',
              color: '#e0e0e0',
              cursor: 'pointer'
            }}
          >
            <option value="fabric">Hyperledger Fabric</option>
            <option value="sawtooth">Hyperledger Sawtooth</option>
          </select>
        </div>

        {result && (
          <div className={result.success ? 'success' : 'error'}>
            {result.success ? (
              <>
                <p>✓ Seed certified successfully!</p>
                <p>Seed ID: {result.data.seed_id}</p>
                <p>Blockchain TX: {result.data.blockchain_tx_id}</p>
              </>
            ) : (
              <p>✗ {result.error}</p>
            )}
          </div>
        )}

        {loading ? (
          <p className="loading">Loading seeds...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Prediction</th>
                <th>Confidence</th>
                <th>Quality</th>
                <th>Blockchain Status</th>
                <th>Type</th>
                <th>Certifier</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {seeds.map(seed => (
                <tr key={seed.id}>
                  <td>{seed.id}</td>
                  <td>{seed.prediction}</td>
                  <td>{formatPercentage(seed.confidence)}</td>
                  <td>{seed.quality}</td>
                  <td>{seed.blockchain_synced ? '✓ Certified' : '✗ Not Certified'}</td>
                  <td>{seed.blockchain_type || 'N/A'}</td>
                  <td>{seed.signer_name || 'Unknown'}</td>
                  <td>
                    {seed.blockchain_synced ? (
                      <span className="disabled">Already Certified</span>
                    ) : (
                      <button
                        onClick={() => handleCertify(seed.id)}
                        disabled={certifying === seed.id}
                      >
                        {certifying === seed.id ? 'Certifying...' : 'Certify'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
