import Link from 'next/link'

const plans = [
  {
    name: 'Starter',
    price: 29,
    description: 'Perfect for beginners',
    features: [
      '8% profit target',
      '5% max daily loss',
      '15% max drawdown',
      '2% max stake per bet',
      'Basic markets (NBA, NFL, MLB)',
      'Email support'
    ],
    popular: false
  },
  {
    name: 'Standard',
    price: 59,
    description: 'Most popular choice',
    features: [
      '10% profit target',
      '5% max daily loss',
      '15% max drawdown',
      '3% max stake per bet',
      'All major sports',
      'Priority support',
      'Advanced analytics'
    ],
    popular: true
  },
  {
    name: 'Pro',
    price: 99,
    description: 'For serious evaluators',
    features: [
      '12% profit target',
      '5% max daily loss',
      '15% max drawdown',
      '5% max stake per bet',
      'All sports + live markets',
      'Dedicated support',
      'Custom analytics',
      'Early access to new features'
    ],
    popular: false
  }
]

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              ProfitPlay
            </Link>
            <nav className="flex space-x-8">
              <Link href="/" className="text-gray-500 hover:text-gray-900">
                Home
              </Link>
              <Link href="/auth/signin" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Sign In
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Evaluation Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start your journey to becoming a disciplined, profitable evaluator. 
            All plans include risk-free simulation with real market data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl shadow-lg p-8 ${
                plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={`/auth/signup?plan=${plan.name.toLowerCase()}`}
                className={`w-full block text-center py-3 px-6 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What is ProfitPlay?
              </h3>
              <p className="text-gray-600">
                ProfitPlay is a simulation-based evaluation platform that helps you develop 
                disciplined performance skills using real market data without financial risk.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is this real money wagering?
              </h3>
              <p className="text-gray-600">
                No, this is purely a simulation platform. No real money is wagered by users. 
                We use real market data to create realistic evaluation scenarios.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What happens after I complete a challenge?
              </h3>
              <p className="text-gray-600">
                Upon successful completion of your evaluation, you'll be eligible for our 
                funded program (coming soon) where you can manage real capital based on 
                your proven performance.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I cancel my subscription anytime?
              </h3>
              <p className="text-gray-600">
                Yes, you can cancel your subscription at any time. Your evaluation progress 
                will be saved and you can resume when you're ready.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
