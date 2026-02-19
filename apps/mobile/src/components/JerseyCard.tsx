import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

type JerseyCardProps = {
  number: number | string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  label?: string
}

export function JerseyCard({
  number,
  primaryColor = '#22c55e',
  secondaryColor = '#16a34a',
  accentColor = '#0b1220',
  label
}: JerseyCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.labelText}>{label || 'Player'}</Text>
      </View>
      <View style={styles.jerseyWrapper}>
        <View style={[styles.sleeve, { backgroundColor: secondaryColor }]} />
        <View style={styles.bodyContainer}>
          <LinearGradient
            colors={[secondaryColor, primaryColor, accentColor]}
            locations={[0, 0.6, 1]}
            style={styles.body}
          >
            <View style={styles.collar} />
            <View style={styles.trim} />
            <Text style={styles.number}>{number}</Text>
            <View style={styles.highlight} />
          </LinearGradient>
        </View>
        <View style={[styles.sleeve, { backgroundColor: secondaryColor }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  headerRow: {
    marginBottom: 10
  },
  labelText: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'uppercase'
  },
  jerseyWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center'
  },
  sleeve: {
    width: 28,
    height: 44,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginTop: 10
  },
  bodyContainer: {
    flex: 1,
    alignItems: 'center'
  },
  body: {
    width: 120,
    height: 150,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  collar: {
    position: 'absolute',
    top: 8,
    width: 38,
    height: 16,
    backgroundColor: '#0b1220',
    borderRadius: 8
  },
  trim: {
    position: 'absolute',
    top: 42,
    width: 80,
    height: 6,
    backgroundColor: '#0b1220',
    opacity: 0.7,
    borderRadius: 3
  },
  number: {
    color: '#e2e8f0',
    fontSize: 48,
    fontWeight: '800'
  },
  highlight: {
    position: 'absolute',
    left: 10,
    top: 10,
    bottom: 10,
    width: 40,
    backgroundColor: '#ffffff',
    opacity: 0.08,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    transform: [{ skewX: '-12deg' }]
  }
})
