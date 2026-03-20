-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- PROFILES
-- ==========================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  home_country TEXT,
  preferred_currency TEXT DEFAULT 'EUR',
  theme_preference TEXT DEFAULT 'dark',
  color_scheme TEXT DEFAULT 'emerald',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles viewable by anyone" ON profiles FOR SELECT USING (is_public OR auth.uid() = id);
CREATE POLICY "Users manage own profile" ON profiles FOR ALL USING (auth.uid() = id);

-- ==========================================
-- PLACES (global reference data)
-- ==========================================
CREATE TABLE places (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  name_local TEXT,
  type TEXT NOT NULL CHECK (type IN ('country', 'city', 'neighborhood', 'landmark', 'region')),
  country_code CHAR(2),
  country_name TEXT,
  continent TEXT,
  region TEXT,
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  timezone TEXT,
  population BIGINT,
  area_km2 DECIMAL(12, 2),
  osm_id TEXT,
  iso3166_1 CHAR(2),
  iso3166_2 TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_places_type ON places(type);
CREATE INDEX idx_places_country ON places(country_code);
CREATE INDEX idx_places_continent ON places(continent);
CREATE INDEX idx_places_name ON places USING gin(to_tsvector('english', name));

-- ==========================================
-- VISITS
-- ==========================================
CREATE TABLE visits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  place_id UUID REFERENCES places(id) ON DELETE CASCADE,
  -- Denormalized for performance
  place_name TEXT NOT NULL,
  place_type TEXT NOT NULL,
  country_code CHAR(2),
  country_name TEXT,
  continent TEXT,
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  -- Visit details
  visited_at DATE,
  departed_at DATE,
  notes TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  ranking INTEGER, -- personal top list position
  is_quick_memory BOOLEAN DEFAULT false, -- marked without details
  is_private BOOLEAN DEFAULT false,
  -- Media
  cover_photo_url TEXT,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own visits" ON visits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public visits viewable" ON visits FOR SELECT USING (NOT is_private);

CREATE INDEX idx_visits_user ON visits(user_id);
CREATE INDEX idx_visits_country ON visits(country_code);
CREATE INDEX idx_visits_continent ON visits(continent);
CREATE INDEX idx_visits_date ON visits(visited_at);

-- ==========================================
-- VISIT PHOTOS
-- ==========================================
CREATE TABLE visit_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  taken_at DATE,
  is_cover BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE visit_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own photos" ON visit_photos FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- WISHLIST
-- ==========================================
CREATE TABLE wishlist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  place_id UUID REFERENCES places(id) ON DELETE CASCADE,
  place_name TEXT NOT NULL,
  place_type TEXT NOT NULL,
  country_code CHAR(2),
  country_name TEXT,
  continent TEXT,
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  notes TEXT,
  target_year INTEGER,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wishlist" ON wishlist FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public wishlist viewable" ON wishlist FOR SELECT USING (NOT is_private);

CREATE INDEX idx_wishlist_user ON wishlist(user_id);
CREATE INDEX idx_wishlist_priority ON wishlist(priority);

-- ==========================================
-- ANNUAL GOALS
-- ==========================================
CREATE TABLE annual_goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  target_countries INTEGER,
  target_cities INTEGER,
  target_continents INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year)
);

ALTER TABLE annual_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goals" ON annual_goals FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- BADGES
-- ==========================================
CREATE TABLE badge_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('world', 'continent', 'country', 'city', 'special')),
  condition_type TEXT NOT NULL,
  condition_value JSONB NOT NULL,
  tier INTEGER DEFAULT 1
);

INSERT INTO badge_definitions (id, name, description, icon, category, condition_type, condition_value, tier) VALUES
  ('world_10', 'World Explorer', 'Visited 10% of countries', '🌍', 'world', 'countries_percent', '{"threshold": 10}', 1),
  ('world_25', 'Globe Trotter', 'Visited 25% of countries', '🌎', 'world', 'countries_percent', '{"threshold": 25}', 2),
  ('world_50', 'Hemisphere Hero', 'Visited 50% of countries', '🌏', 'world', 'countries_percent', '{"threshold": 50}', 3),
  ('world_75', 'World Wanderer', 'Visited 75% of countries', '✈️', 'world', 'countries_percent', '{"threshold": 75}', 4),
  ('world_100', 'World Master', 'Visited every country', '👑', 'world', 'countries_percent', '{"threshold": 100}', 5),
  ('europe_25', 'European Discoverer', 'Visited 25% of Europe', '🏰', 'continent', 'continent_percent', '{"continent": "Europe", "threshold": 25}', 1),
  ('europe_50', 'European Explorer', 'Visited 50% of Europe', '⚜️', 'continent', 'continent_percent', '{"continent": "Europe", "threshold": 50}', 2),
  ('europe_100', 'European Master', 'Visited all of Europe', '🗼', 'continent', 'continent_percent', '{"continent": "Europe", "threshold": 100}', 3),
  ('asia_25', 'Asian Adventurer', 'Visited 25% of Asia', '🏯', 'continent', 'continent_percent', '{"continent": "Asia", "threshold": 25}', 1),
  ('americas_25', 'Americas Explorer', 'Visited 25% of the Americas', '🗽', 'continent', 'continent_percent', '{"continent": "Americas", "threshold": 25}', 1),
  ('africa_25', 'African Explorer', 'Visited 25% of Africa', '🦁', 'continent', 'continent_percent', '{"continent": "Africa", "threshold": 25}', 1),
  ('first_visit', 'First Steps', 'Log your first visit', '👣', 'special', 'total_visits', '{"threshold": 1}', 1),
  ('visits_10', 'Seasoned Traveler', 'Log 10 visits', '🧭', 'special', 'total_visits', '{"threshold": 10}', 1),
  ('visits_50', 'Veteran Explorer', 'Log 50 visits', '🗺️', 'special', 'total_visits', '{"threshold": 50}', 2),
  ('visits_100', 'Century Club', 'Log 100 visits', '💯', 'special', 'total_visits', '{"threshold": 100}', 3);

-- ==========================================
-- USER BADGES
-- ==========================================
CREATE TABLE user_badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id TEXT REFERENCES badge_definitions(id) NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges viewable by owner" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System inserts badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- STATS VIEW (materialized for performance)
-- ==========================================
CREATE OR REPLACE VIEW user_stats AS
SELECT
  v.user_id,
  COUNT(DISTINCT CASE WHEN v.place_type = 'country' THEN v.country_code ELSE NULL END) +
    COUNT(DISTINCT CASE WHEN v.place_type != 'country' THEN v.country_code ELSE NULL END) as countries_visited,
  COUNT(DISTINCT v.continent) as continents_visited,
  COUNT(DISTINCT CASE WHEN v.place_type IN ('city', 'neighborhood', 'landmark') THEN v.place_id ELSE NULL END) as cities_visited,
  COUNT(*) as total_visits,
  MIN(v.visited_at) as first_visit,
  MAX(v.visited_at) as last_visit
FROM visits v
GROUP BY v.user_id;

-- ==========================================
-- FOLLOWS / SOCIAL
-- ==========================================
CREATE TABLE follows (
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own follows" ON follows FOR ALL USING (auth.uid() = follower_id);
CREATE POLICY "Anyone view follows" ON follows FOR SELECT USING (true);

-- ==========================================
-- SHARED MAPS
-- ==========================================
CREATE TABLE shared_maps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  filter_type TEXT DEFAULT 'all' CHECK (filter_type IN ('all', 'country', 'continent', 'wishlist')),
  filter_value TEXT,
  show_stats BOOLEAN DEFAULT true,
  show_badges BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE shared_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own shares" ON shared_maps FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone view active shares" ON shared_maps FOR SELECT USING (is_active);

-- ==========================================
-- FUNCTIONS
-- ==========================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_wishlist_updated_at BEFORE UPDATE ON wishlist FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('visit-photos', 'visit-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Users upload own photos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'visit-photos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Public read photos" ON storage.objects FOR SELECT USING (bucket_id IN ('visit-photos', 'avatars'));
CREATE POLICY "Users manage own photos" ON storage.objects FOR DELETE USING (
  bucket_id = 'visit-photos' AND auth.uid()::text = (storage.foldername(name))[1]
);
