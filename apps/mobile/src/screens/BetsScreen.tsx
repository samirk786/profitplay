import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { ScreenLayout } from './ScreenLayout'

export function BetsScreen() {
  return (
    <ScreenLayout title="Bets">
      <View style={styles.card}>
        <Text style={styles.label}>Active bets</Text>
        <Text style={styles.value}>Your open bets will appear here.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Bet history</Text>
        <Text style={styles.value}>Your settled bets will appear here.</Text>
      </View>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1f2937',
    marginBottom: 12
  },
  label: {
    color: '#f8fafc',
    fontWeight: '600',
    marginBottom: 6
  },
  value: {
    color: '#94a3b8'
  }
})
