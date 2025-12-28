'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import Nav from '../components/Nav'
import { API_URL } from '../../lib/config'
import { formatPercentage } from '../../utils/formatting'

export default function History() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  useEffect(() => {
    axios.get(`${API_URL}/api/history/`)
      .then(res => setHistory(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <>
      <Nav />
      <div className="container">
        <h1>Classification History</h1>
        <p className="loading">Loading...</p>
      </div>
    </>
  )

  // Pagination logic
  const totalPages = Math.ceil(history.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = history.slice(startIndex, endIndex)

  const goToPage = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value))
    setCurrentPage(1)
  }

  return (
    <>
      <Nav />
      <div className="container">
        <h1>Classification History</h1>

        <div className="stats">
          <p>Total Records: {history.length}</p>
          <p>Page {currentPage} of {totalPages}</p>
          <div className="items-per-page">
            <label>Items per page:</label>
            <select value={itemsPerPage} onChange={handleItemsPerPageChange}>
              <option value={5}>5</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={75}>75</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {currentItems.map(item => (
          <div key={item.id} className="card">
            <img src={`${API_URL}${item.image}`} alt="seed" />
            <div>
              <p><strong>{item.prediction}</strong> ({formatPercentage(item.confidence)})</p>
              <p>Quality: {item.quality}</p>
              <p>{new Date(item.uploaded_at).toLocaleString()}</p>
              {item.blockchain_tx_id && (
                <p className="blockchain-tx">TX: {item.blockchain_tx_id.substring(0, 24)}...</p>
              )}
            </div>
          </div>
        ))}

        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => goToPage(i + 1)}
                className={currentPage === i + 1 ? 'active' : ''}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  )
}
