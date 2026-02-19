export type FeatureFlags = {
  enableBets: boolean
  enablePush: boolean
}

const defaultFlags: FeatureFlags = {
  enableBets: true,
  enablePush: true
}

export async function fetchFeatureFlags(): Promise<FeatureFlags> {
  return defaultFlags
}
