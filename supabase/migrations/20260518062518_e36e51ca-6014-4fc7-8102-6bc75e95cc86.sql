
-- Seed shared household
INSERT INTO public.households (id, name)
VALUES ('00000000-0000-0000-0000-0000000000a1', 'Shared Family')
ON CONFLICT (id) DO NOTHING;

-- Events: replace strict policies with open ones scoped to shared household
DROP POLICY IF EXISTS "Members view household events" ON public.events;
DROP POLICY IF EXISTS "Members insert household events" ON public.events;
DROP POLICY IF EXISTS "Members update household events" ON public.events;
DROP POLICY IF EXISTS "Members delete household events" ON public.events;

CREATE POLICY "Anyone reads shared events" ON public.events
  FOR SELECT TO anon, authenticated
  USING (household_id = '00000000-0000-0000-0000-0000000000a1');

CREATE POLICY "Anyone inserts shared events" ON public.events
  FOR INSERT TO anon, authenticated
  WITH CHECK (household_id = '00000000-0000-0000-0000-0000000000a1');

CREATE POLICY "Anyone updates shared events" ON public.events
  FOR UPDATE TO anon, authenticated
  USING (household_id = '00000000-0000-0000-0000-0000000000a1')
  WITH CHECK (household_id = '00000000-0000-0000-0000-0000000000a1');

CREATE POLICY "Anyone deletes shared events" ON public.events
  FOR DELETE TO anon, authenticated
  USING (household_id = '00000000-0000-0000-0000-0000000000a1');

-- Uploaded images: open for shared household
DROP POLICY IF EXISTS "Members view household uploads" ON public.uploaded_images;
DROP POLICY IF EXISTS "Members insert household uploads" ON public.uploaded_images;

CREATE POLICY "Anyone reads shared uploads" ON public.uploaded_images
  FOR SELECT TO anon, authenticated
  USING (household_id = '00000000-0000-0000-0000-0000000000a1');

CREATE POLICY "Anyone inserts shared uploads" ON public.uploaded_images
  FOR INSERT TO anon, authenticated
  WITH CHECK (household_id = '00000000-0000-0000-0000-0000000000a1');

-- Households: allow anonymous read of the shared household + rename
DROP POLICY IF EXISTS "Members view their household" ON public.households;
DROP POLICY IF EXISTS "Members update their household" ON public.households;

CREATE POLICY "Anyone reads shared household" ON public.households
  FOR SELECT TO anon, authenticated
  USING (id = '00000000-0000-0000-0000-0000000000a1');

CREATE POLICY "Anyone renames shared household" ON public.households
  FOR UPDATE TO anon, authenticated
  USING (id = '00000000-0000-0000-0000-0000000000a1')
  WITH CHECK (id = '00000000-0000-0000-0000-0000000000a1');

-- Storage policies for flyers bucket (allow anon upload + read)
DROP POLICY IF EXISTS "Anyone uploads flyers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone reads flyers" ON storage.objects;

CREATE POLICY "Anyone reads flyers" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'flyers');

CREATE POLICY "Anyone uploads flyers" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'flyers');

-- Enable realtime for events
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
