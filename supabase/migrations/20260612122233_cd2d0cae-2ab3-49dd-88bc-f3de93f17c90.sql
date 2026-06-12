DROP POLICY IF EXISTS obs_images_read ON storage.objects;
CREATE POLICY obs_images_read_own ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'observations' AND (auth.uid())::text = (storage.foldername(name))[1]);