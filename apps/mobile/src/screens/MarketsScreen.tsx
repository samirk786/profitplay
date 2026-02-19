import React, { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'

import { MarketSummary } from '@profitplay/shared'
import { apiRequest } from '../api/client'
import { JerseyCard } from '../components'
import { ScreenLayout } from './ScreenLayout'

export function MarketsScreen() {
  const [markets, setMarkets] = useState<MarketSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    apiRequest<{ markets: MarketSummary[] }>('/api/markets')
      .then(response => {
        if (isMounted) {
          setMarkets(response.markets || [])
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load markets.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <ScreenLayout title="Markets">
      {loading && <ActivityIndicator />}
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={markets}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.title}>{item.sport} · {item.league}</Text>
                <Text style={styles.subtitle}>{item.marketType} · {new Date(item.startTime).toLocaleString()}</Text>
              </View>
              <JerseyCard
                number={(index % 99) + 1}
                primaryColor="#3b82f6"
                secondaryColor="#22c55e"
                accentColor="#0b1220"
                label={item.participants?.[0] || 'Player'}
              />
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: 12
  },
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#1f2937'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  info: {
    flex: 1
  },
  title: {
    color: '#f8fafc',
    fontWeight: '600'
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: 4
  },
  error: {
    color: '#f87171',
    marginBottom: 12
  }
})
