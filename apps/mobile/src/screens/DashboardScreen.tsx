import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { ScreenLayout } from './ScreenLayout'

export function DashboardScreen() {
  return (
    <ScreenLayout title="Dashboard">
      <View style={styles.card}>
        <Text style={styles.label}>Account summary</Text>
        <Text style={styles.value}>Balance, performance, and active challenges will appear here.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Recent activity</Text>
        <Text style={styles.value}>Recent bets and settlements will appear here.</Text>
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
