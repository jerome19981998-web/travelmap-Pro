-- Seed data for development/testing
-- Run after the initial migration

-- Sample places (global reference data)
INSERT INTO places (name, type, country_code, country_name, continent, lat, lng) VALUES
  ('France', 'country', 'FR', 'France', 'Europe', 46.2276, 2.2137),
  ('Germany', 'country', 'DE', 'Germany', 'Europe', 51.1657, 10.4515),
  ('Japan', 'country', 'JP', 'Japan', 'Asia', 36.2048, 138.2529),
  ('United States', 'country', 'US', 'United States', 'Americas', 37.0902, -95.7129),
  ('Brazil', 'country', 'BR', 'Brazil', 'Americas', -14.2350, -51.9253),
  ('South Africa', 'country', 'ZA', 'South Africa', 'Africa', -30.5595, 22.9375),
  ('Australia', 'country', 'AU', 'Australia', 'Oceania', -25.2744, 133.7751),
  ('Morocco', 'country', 'MA', 'Morocco', 'Africa', 31.7917, -7.0926),
  ('Thailand', 'country', 'TH', 'Thailand', 'Asia', 15.8700, 100.9925),
  ('Italy', 'country', 'IT', 'Italy', 'Europe', 41.8719, 12.5674),
  ('Paris', 'city', 'FR', 'France', 'Europe', 48.8566, 2.3522),
  ('Tokyo', 'city', 'JP', 'Japan', 'Asia', 35.6762, 139.6503),
  ('New York', 'city', 'US', 'United States', 'Americas', 40.7128, -74.0060),
  ('London', 'city', 'GB', 'United Kingdom', 'Europe', 51.5074, -0.1278),
  ('Rome', 'city', 'IT', 'Italy', 'Europe', 41.9028, 12.4964),
  ('Barcelona', 'city', 'ES', 'Spain', 'Europe', 41.3851, 2.1734),
  ('Bangkok', 'city', 'TH', 'Thailand', 'Asia', 13.7563, 100.5018),
  ('Sydney', 'city', 'AU', 'Australia', 'Oceania', -33.8688, 151.2093),
  ('Rio de Janeiro', 'city', 'BR', 'Brazil', 'Americas', -22.9068, -43.1729),
  ('Marrakech', 'city', 'MA', 'Morocco', 'Africa', 31.6295, -7.9811);
