export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export const ROLES = {
  ADMIN: 'admin',
  MOH_OFFICER: 'moh_officer',
  EPHI_OFFICER: 'ephi_officer',
  REGIONAL_OFFICER: 'regional_officer',
  PUBLIC_USER: 'public_user',
} as const;

export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  VERY_HIGH: 'very_high',
} as const;

export const UPLOAD_TYPES = {
  WEEKLY_MALARIA: 'weekly_malaria',
  MONTHLY_MALARIA: 'monthly_malaria',
  CLIMATE: 'climate',
} as const;

export const ETHIOPIAN_REGIONS = [
  'Addis Ababa',
  'Afar',
  'Amhara',
  'Benishangul-Gumuz',
  'Dire Dawa',
  'Gambela',
  'Harari',
  'Oromia',
  'Sidama',
  'SNNPR',
  'Somali',
  'Tigray',
];
