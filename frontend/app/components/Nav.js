import Link from 'next/link'

export default function Nav() {
  return (
    <nav>
      <Link href="/">Upload</Link>
      <Link href="/history">History</Link>
      <Link href="/database">Database</Link>
      <Link href="/certify">Certify</Link>
      <Link href="/verify">Verify</Link>
    </nav>
  )
}
