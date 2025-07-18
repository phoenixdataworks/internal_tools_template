export type UserGroup = 'A' | 'B';

export interface FeatureFlag {
  enabled: boolean;
  groups?: UserGroup[];
}

export interface FeatureFlags {
  [key: string]: FeatureFlag;
}

export const FEATURES: FeatureFlags = {
  ANALYTICS_NAV: {
    enabled: true,
    groups: ['B'],
  },
};

export function isFeatureEnabled(feature: keyof typeof FEATURES, userGroup?: UserGroup): boolean {
  const featureConfig = FEATURES[feature];

  if (!featureConfig?.enabled) {
    return false;
  }

  if (!featureConfig.groups) {
    return true;
  }

  if (!userGroup) {
    return false;
  }

  return featureConfig.groups.includes(userGroup);
}
