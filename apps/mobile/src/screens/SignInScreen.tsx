import React, { useState } from 'react'
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { userSigninSchema } from '@profitplay/shared'
import { useAuth } from '../auth/AuthProvider'
import { RootStackParamList } from '../navigation/types'
import { ScreenLayout } from './ScreenLayout'

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>

export function SignInScreen({ navigation }: Props) {
  const { signIn, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSignIn = async () => {
    try {
      userSigninSchema.parse({ email, password })
      await signIn({ email, password })
      navigation.replace('Home')
    } catch (error) {
      Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Try again.')
    }
  }

  return (
    <ScreenLayout title="Welcome back">
      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor="#94a3b8"
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#94a3b8"
        />
        <Button title={loading ? 'Signing in...' : 'Sign In'} onPress={handleSignIn} disabled={loading} />
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>New here?</Text>
        <Button title="Create an account" onPress={() => navigation.navigate('SignUp')} />
      </View>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  form: {
    gap: 12
  },
  label: {
    color: '#e2e8f0',
    fontWeight: '600'
  },
  input: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    backgroundColor: '#111827'
  },
  footer: {
    marginTop: 24,
    gap: 8
  },
  footerText: {
    color: '#94a3b8'
  }
})
