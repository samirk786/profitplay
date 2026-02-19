import React from 'react'
import { SafeAreaView, StyleSheet, Text, View } from 'react-native'

type ScreenLayoutProps = {
  title: string
  children?: React.ReactNode
}

export function ScreenLayout({ title, children }: ScreenLayoutProps) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingTop: 12
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 16
  },
  content: {
    flex: 1
  }
})
