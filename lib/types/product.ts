export type BuildType = 
  | 'statues' 
  | 'houses' 
  | 'portals' 
  | 'vehicles' 
  | 'fountains' 
  | 'organics' 
  | 'asset_packs' 
  | 'maps' 
  | 'other'

export type ThemeCategory = 
  | 'fantasy' 
  | 'medieval' 
  | 'modern' 
  | 'ancient' 
  | 'christmas' 
  | 'halloween' 
  | 'brutalist' 
  | 'sci_fi' 
  | 'nature' 
  | 'other'

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert'

export type UserTier = 'explorer' | 'access' | 'builder' | 'architect' | 'admin'

export interface ProductPublisher {
  id: string
  handle: string
  display_name: string
  avatar_url: string
}

export interface Product {
  id: string
  slug: string
  title: string
  subtitle: string
  description: string
  image_url: string
  tags: string[]
  build_type: BuildType
  theme_category: ThemeCategory
  difficulty: DifficultyLevel
  tier: UserTier
  guide_url: string
  download_url: string
  total_likes: number
  user_liked: boolean
  created_at: string
  publisher: ProductPublisher | null
}

export interface ProductCard {
  id: string
  slug: string
  title: string
  subtitle: string
  image_url: string
  tags: string[]
  build_type: BuildType
  theme_category: ThemeCategory
  difficulty: DifficultyLevel
  tier: UserTier
  total_likes: number
  created_at: string
}

export interface BrowseFilters {
  search: string
  buildTypes: BuildType[]
  themeCategories: ThemeCategory[]
  tiers: UserTier[]
  difficulties: DifficultyLevel[]
  sortBy: 'newest' | 'oldest' | 'popular' | 'title_asc' | 'title_desc'
}

export interface BrowseResponse {
  status: string
  products: ProductCard[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export const BUILD_TYPE_LABELS: Record<BuildType, string> = {
  statues: 'Statues',
  houses: 'Houses',
  portals: 'Portals',
  vehicles: 'Vehicles',
  fountains: 'Fountains',
  organics: 'Organics',
  asset_packs: 'Asset Packs',
  maps: 'Maps',
  other: 'All Types',
}

export const THEME_CATEGORY_LABELS: Record<ThemeCategory, string> = {
  fantasy: 'Fantasy',
  medieval: 'Medieval',
  modern: 'Modern',
  ancient: 'Ancient',
  christmas: 'Christmas',
  halloween: 'Halloween',
  brutalist: 'Brutalist',
  sci_fi: 'Sci-Fi',
  nature: 'Nature',
  other: 'All Themes',
}

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
}

export const TIER_LABELS: Record<UserTier, string> = {
  explorer: 'Explorer',
  access: 'Access',
  builder: 'Builder',
  architect: 'Architect',
  admin: 'Admin',
}

export const TIER_COLORS: Record<UserTier, string> = {
  explorer: '#22c55e',
  access: '#8b5cf6',
  builder: '#f59e0b',
  architect: '#ef4444',
  admin: '#ec4899',
}
