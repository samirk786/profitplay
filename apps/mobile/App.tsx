import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StripeProvider } from '@stripe/stripe-react-native'
import { StatusBar } from 'expo-status-bar'

import { trackEvent } from './src/analytics/client'
import { AuthProvider } from './src/auth/AuthProvider'
import { RootStackParamList } from './src/navigation/types'
import { registerForPushNotificationsAsync } from './src/notifications/notifications'
import { getStripePublishableKey } from './src/payments/stripe'
import { fetchFeatureFlags } from './src/featureFlags/featureFlags'
import {
  BetsScreen,
  DashboardScreen,
  HomeScreen,
  MarketsScreen,
  PricingScreen,
  SignInScreen,
  SignUpScreen
} from './src/screens'

const Stack = createNativeStackNavigator<RootStackParamList>()

const linking = {
  prefixes: ['profitplay://'],
  config: {
    screens: {
      SignIn: 'signin',
      SignUp: 'signup',
      Home: '',
      Markets: 'markets',
      Dashboard: 'dashboard',
      Bets: 'bets',
      Pricing: 'pricing'
    }
  }
}

export default function App() {
  useEffect(() => {
    fetchFeatureFlags().then(flags => {
      trackEvent({ name: 'feature_flags_loaded', properties: flags })
    })

    registerForPushNotificationsAsync().then(token => {
      if (token) {
        trackEvent({ name: 'push_registered' })
      }
    })
  }, [])

  return (
    <AuthProvider>
      <StripeProvider
        publishableKey={getStripePublishableKey()}
        merchantIdentifier="merchant.com.profitplay"
        urlScheme="profitplay"
      >
        <NavigationContainer linking={linking}>
          <StatusBar style="auto" />
          <Stack.Navigator initialRouteName="SignIn">
            <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: 'Sign In' }} />
            <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Sign Up' }} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Markets" component={MarketsScreen} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Bets" component={BetsScreen} />
            <Stack.Screen name="Pricing" component={PricingScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </StripeProvider>
    </AuthProvider>
  )
}
