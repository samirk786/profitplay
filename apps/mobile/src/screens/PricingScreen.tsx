import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { ScreenLayout } from './ScreenLayout'

export function PricingScreen() {
  return (
    <ScreenLayout title="Pricing">
      <View style={styles.card}>
        <Text style={styles.plan}>Starter</Text>
        <Text style={styles.detail}>Great for getting started with ProfitPlay.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.plan}>Standard</Text>
        <Text style={styles.detail}>For active traders who want more flexibility.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.plan}>Pro</Text>
        <Text style={styles.detail}>For advanced players and larger challenges.</Text>
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
  plan: {
    color: '#f8fafc',
    fontWeight: '700',
    marginBottom: 4
  },
  detail: {
    color: '#94a3b8'
  }
})
