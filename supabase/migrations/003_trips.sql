-- ==========================================
-- TRIPS
-- ==========================================
CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  started_at DATE,
  ended_at DATE,
  cover_photo_url TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_stops (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stop_order INTEGER NOT NULL DEFAULT 0,
  place_name TEXT NOT NULL,
  country_code CHAR(2),
  country_name TEXT,
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  arrived_at DATE,
  departed_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own trips" ON trips FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public trips viewable" ON trips FOR SELECT USING (NOT is_private);
CREATE POLICY "Users manage own trip stops" ON trip_stops FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public trip stops viewable" ON trip_stops FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_stops.trip_id
    AND trips.is_private = false
  )
);

CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_dates ON trips(started_at, ended_at);
CREATE INDEX IF NOT EXISTS idx_trip_stops_trip ON trip_stops(trip_id, stop_order);
CREATE INDEX IF NOT EXISTS idx_trip_stops_user ON trip_stops(user_id);
