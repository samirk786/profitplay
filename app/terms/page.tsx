import Link from 'next/link'

export default function Terms() {
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
          Terms of Service
        </h1>

        <div style={{ color: '#cccccc', lineHeight: 1.8, fontSize: '0.9375rem' }}>
          <p><strong>Last updated:</strong> February 2026</p>

          <h2 style={{ color: 'white', fontSize: '1.25rem', marginTop: '2rem' }}>1. Overview</h2>
          <p>
            ProfitPlay is a simulated sports betting platform designed for entertainment and skill evaluation purposes only.
            No real money is wagered, won, or lost. All balances and payouts are virtual.
          </p>

          <h2 style={{ color: 'white', fontSize: '1.25rem', marginTop: '2rem' }}>2. Eligibility</h2>
          <p>
            You must be at least 18 years of age to create an account and use ProfitPlay.
            By creating an account, you confirm that you meet this age requirement.
          </p>

          <h2 style={{ color: 'white', fontSize: '1.25rem', marginTop: '2rem' }}>3. Simulated Betting</h2>
          <p>
            All betting activities on ProfitPlay use virtual currency only. ProfitPlay is not a gambling platform.
            No real money deposits or withdrawals are involved. Challenge accounts, scores, and payouts are entirely simulated.
          </p>

          <h2 style={{ color: 'white', fontSize: '1.25rem', marginTop: '2rem' }}>4. Account Responsibilities</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials.
            You agree not to share your account with others or create multiple accounts.
          </p>

          <h2 style={{ color: 'white', fontSize: '1.25rem', marginTop: '2rem' }}>5. Acceptable Use</h2>
          <p>
            You agree to use ProfitPlay for its intended purpose. You may not attempt to manipulate, exploit,
            or abuse the platform, its odds data, or its scoring systems.
          </p>

          <h2 style={{ color: 'white', fontSize: '1.25rem', marginTop: '2rem' }}>6. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of ProfitPlay after changes
            constitutes acceptance of the updated terms.
          </p>

          <h2 style={{ color: 'white', fontSize: '1.25rem', marginTop: '2rem' }}>7. Contact</h2>
          <p>
            For questions about these terms, please contact us at support@profitplay.io.
          </p>
        </div>
      </div>
    </div>
  )
}
