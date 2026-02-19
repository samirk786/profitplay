import React from 'react'
import { Button, StyleSheet, Text, View } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { useAuth } from '../auth/AuthProvider'
import { RootStackParamList } from '../navigation/types'
import { ScreenLayout } from './ScreenLayout'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

export function HomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth()

  return (
    <ScreenLayout title="ProfitPlay">
      <View style={styles.card}>
        <Text style={styles.text}>Signed in as {user?.email || 'guest'}.</Text>
      </View>
      <View style={styles.actions}>
        <Button title="Markets" onPress={() => navigation.navigate('Markets')} />
        <Button title="Dashboard" onPress={() => navigation.navigate('Dashboard')} />
        <Button title="Bets" onPress={() => navigation.navigate('Bets')} />
        <Button title="Pricing" onPress={() => navigation.navigate('Pricing')} />
        <Button title="Sign out" onPress={signOut} />
      </View>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1f2937',
    marginBottom: 16
  },
  text: {
    color: '#e2e8f0'
  },
  actions: {
    gap: 12
  }
})
