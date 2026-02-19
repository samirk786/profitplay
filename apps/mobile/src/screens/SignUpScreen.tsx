import React, { useState } from 'react'
import { Alert, Button, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { commonValidations } from '@profitplay/shared'
import { useAuth } from '../auth/AuthProvider'
import { RootStackParamList } from '../navigation/types'
import { ScreenLayout } from './ScreenLayout'

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>

export function SignUpScreen({ navigation }: Props) {
  const { signUp, loading } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ageVerified, setAgeVerified] = useState(false)

  const handleSignUp = async () => {
    try {
      if (!name.trim()) {
        throw new Error('Name is required')
      }
      if (!ageVerified) {
        throw new Error('You must verify your age')
      }
      commonValidations.email.parse(email)
      commonValidations.password.parse(password)
      await signUp({ name, email, password, ageVerified })
      navigation.replace('Home')
    } catch (error) {
      Alert.alert('Sign up failed', error instanceof Error ? error.message : 'Try again.')
    }
  }

  return (
    <ScreenLayout title="Create account">
      <View style={styles.form}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Samir Kassam"
          placeholderTextColor="#94a3b8"
        />
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
        <View style={styles.switchRow}>
          <Text style={styles.label}>I am 18+</Text>
          <Switch value={ageVerified} onValueChange={setAgeVerified} />
        </View>
        <Button title={loading ? 'Creating...' : 'Create Account'} onPress={handleSignUp} disabled={loading} />
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Button title="Back to sign in" onPress={() => navigation.goBack()} />
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  footer: {
    marginTop: 24,
    gap: 8
  },
  footerText: {
    color: '#94a3b8'
  }
})
