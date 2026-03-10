import Link from 'next/link'

export default function Privacy() {
  return (
    <div className="App">
      <div style={{
        minHeight: '100vh',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '2rem',
        color: 'white'
      }}>
        <Link href="/" style={{ color: '#3B82F6', textDecoration: 'none', fontSize: '0.875rem' }}>
          &larr; Back to ProfitPlay
        </Link>

        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '2rem', marginBottom: '1rem' }}>
          Privacy Policy
        </h1>

        <div style={{ color: '#cccccc', lineHeight: 1.8, fontSize: '0.9375rem' }}>
          <p><strong>Last updated:</strong> February 2026</p>

          <h2 style={{ color: 'white', fontSize: '1.25rem', marginTop: '2rem' }}>1. Information We Collect</h2>
          <p>
            When you create an account, we collect your name, email address, and a hashed version of your password.
            We also collect usage data such as bets placed, challenge progress, and login activity.
          </p>

          <h2 style={{ color: 'white', fontSize: '1.25rem', marginTop: '2rem' }}>2. How We Use Your Information</h2>
          <p>
            We use your information to provide and improve ProfitPlay, including managing your account,
            tracking challenge progress, and communicating important updates about the platform.
          </p>

          <h2 style={{ color: 'white', fontSize: '1.25rem', marginTop: '2rem' }}>3. Data Storage</h2>
          <p>
            Your data is stored securely using industry-standard encryption and security practices.
            Passwords are hashed and never stored in plain text.
          </p>

          <h2 style={{ color: 'white', fontSize: '1.25rem', marginTop: '2rem' }}>4. Data Sharing</h2>
          <p>
            We do not sell, trade, or share your personal information with third parties.
            We may share anonymized, aggregate data for analytical purposes.
          </p>

          <h2 style={{ color: 'white', fontSize: '1.25rem', marginTop: '2rem' }}>5. Your Rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data at any time
            by contacting us at support@profitplay.io.
          </p>

          <h2 style={{ color: 'white', fontSize: '1.25rem', marginTop: '2rem' }}>6. Contact</h2>
          <p>
            For privacy-related questions, please contact us at support@profitplay.io.
          </p>
        </div>
      </div>
    </div>
  )
}
