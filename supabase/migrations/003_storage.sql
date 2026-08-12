-- Storage buckets for avatars and poll images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('poll-images', 'poll-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Avatars policies
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Poll images policies
CREATE POLICY "Poll images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'poll-images');

CREATE POLICY "Authenticated users can upload poll images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'poll-images' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their own poll images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'poll-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own poll images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'poll-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
