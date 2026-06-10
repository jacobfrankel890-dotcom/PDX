-- Run once in Supabase SQL editor (Storage → exports bucket for Wix admin downloads)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('exports', 'exports', false, 5242880)
ON CONFLICT (id) DO NOTHING;
