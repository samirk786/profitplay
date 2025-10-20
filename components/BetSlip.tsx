'use client'

import { useState } from 'react'

interface BetSlipProps {
  market: {
    id: string
    sport: string
    participants: string[]
    marketType: string
    startTime: string
    odds: {
      home: number
      away: number
    }
  }
  onClose: () => void
  onPlaceBet: (betData: any) => void
}

export default function BetSlip({ market, onClose, onPlaceBet }: BetSlipProps) {
  const [selectedSide, setSelectedSide] = useState<string>('')
  const [stake, setStake] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const formatOdds = (odds: number) => {
    if (odds > 0) {
      return `+${odds}`
    }
    return odds.toString()
  }

  const calculatePayout = (stakeAmount: number, odds: number) => {
    if (odds > 0) {
      return stakeAmount * (odds / 100)
    } else {
      return stakeAmount * (100 / Math.abs(odds))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const newErrors: Record<string, string> = {}
    const stakeAmount = parseFloat(stake)

    if (!selectedSide) {
      newErrors.selectedSide = 'Please select a side'
    }

    if (!stake || isNaN(stakeAmount) || stakeAmount <= 0) {
      newErrors.stake = 'Please enter a valid stake amount'
    }

    if (stakeAmount < 10) {
      newErrors.stake = 'Minimum stake is $10'
    }

    if (stakeAmount > 1000) {
      newErrors.stake = 'Maximum stake is $1000'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const odds = selectedSide.includes(market.participants[0]) ? market.odds.home : market.odds.away
    const potentialPayout = calculatePayout(stakeAmount, odds)

    onPlaceBet({
      marketId: market.id,
      selection: selectedSide,
      stake: stakeAmount,
      potentialPayout,
      odds
    })
  }

  const getSelectionOptions = () => {
    if (market.marketType === 'MONEYLINE') {
      return [
        { value: market.participants[0], label: market.participants[0], odds: market.odds.home },
        { value: market.participants[1], label: market.participants[1], odds: market.odds.away }
      ]
    } else if (market.marketType === 'SPREAD') {
      return [
        { value: `${market.participants[0]} -3.5`, label: `${market.participants[0]} -3.5`, odds: market.odds.home },
        { value: `${market.participants[1]} +3.5`, label: `${market.participants[1]} +3.5`, odds: market.odds.away }
      ]
    } else if (market.marketType === 'TOTAL') {
      return [
        { value: 'Over 220.5', label: 'Over 220.5', odds: market.odds.home },
        { value: 'Under 220.5', label: 'Under 220.5', odds: market.odds.away }
      ]
    }
    return []
  }

  const selectionOptions = getSelectionOptions()
  const selectedOption = selectionOptions.find(opt => opt.value === selectedSide)
  const stakeAmount = parseFloat(stake) || 0
  const potentialPayout = selectedOption ? calculatePayout(stakeAmount, selectedOption.odds) : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Place Your Bet</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <h4 className="font-medium text-gray-900">
            {market.participants[0]} vs {market.participants[1]}
          </h4>
          <p className="text-sm text-gray-600">
            {market.sport} • {market.marketType}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Your Pick
            </label>
            <div className="space-y-2">
              {selectionOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                    selectedSide === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="selection"
                    value={option.value}
                    checked={selectedSide === option.value}
                    onChange={(e) => setSelectedSide(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <span className="font-medium">{option.label}</span>
                    <span className="ml-2 text-sm text-gray-600">
                      {formatOdds(option.odds)}
                    </span>
                  </div>
                </label>
              ))}
            </div>
            {errors.selectedSide && (
              <p className="mt-1 text-sm text-red-600">{errors.selectedSide}</p>
            )}
          </div>

          <div>
            <label htmlFor="stake" className="block text-sm font-medium text-gray-700 mb-2">
              Stake Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                id="stake"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                placeholder="0.00"
                min="10"
                max="1000"
                step="0.01"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {errors.stake && (
              <p className="mt-1 text-sm text-red-600">{errors.stake}</p>
            )}
          </div>

          {selectedSide && stake && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Stake:</span>
                <span>${stakeAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Potential Payout:</span>
                <span>${potentialPayout.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>Profit:</span>
                <span>${(potentialPayout - stakeAmount).toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Place Bet
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
