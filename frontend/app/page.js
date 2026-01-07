'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to records page on load
    router.replace('/records')
  }, [router])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #0a0a0a, #1a1a1a)',
      color: '#e0e0e0'
    }}>
      <p>Redirecting...</p>
    </div>
  )
}
