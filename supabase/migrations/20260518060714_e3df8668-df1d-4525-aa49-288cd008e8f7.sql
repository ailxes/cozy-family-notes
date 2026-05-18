
CREATE TYPE public.event_category AS ENUM ('school','sports','deadline','spirit_day','personal','other');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Our Family',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.household_members (
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, user_id)
);

CREATE TABLE public.household_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX household_invites_unique_email ON public.household_invites (household_id, lower(email));

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  category public.event_category NOT NULL DEFAULT 'other',
  source text NOT NULL DEFAULT 'manual',
  source_image_url text,
  preparation_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_household_start_idx ON public.events(household_id, start_datetime);

CREATE TABLE public.uploaded_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  parsed boolean NOT NULL DEFAULT false,
  parse_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_household_member(_user uuid, _household uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.household_members WHERE user_id = _user AND household_id = _household);
$$;

CREATE OR REPLACE FUNCTION public.current_household_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT household_id FROM public.household_members WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_household_id uuid;
  v_invite RECORD;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  SELECT * INTO v_invite FROM public.household_invites
    WHERE lower(email) = lower(NEW.email) LIMIT 1;

  IF v_invite.id IS NOT NULL THEN
    INSERT INTO public.household_members (household_id, user_id, role)
      VALUES (v_invite.household_id, NEW.id, 'member');
    DELETE FROM public.household_invites WHERE household_id = v_invite.household_id AND lower(email) = lower(NEW.email);
  ELSE
    INSERT INTO public.households (name) VALUES ('Our Family') RETURNING id INTO v_household_id;
    INSERT INTO public.household_members (household_id, user_id, role)
      VALUES (v_household_id, NEW.id, 'owner');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view profiles in their household" ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.household_members hm1
      JOIN public.household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.user_id = auth.uid() AND hm2.user_id = profiles.id
    )
  );
CREATE POLICY "Users update their own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Members view their household" ON public.households FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), id));
CREATE POLICY "Members update their household" ON public.households FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), id));

CREATE POLICY "Members view their household members" ON public.household_members FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members view invites for their household" ON public.household_invites FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members create invites for their household" ON public.household_invites FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id) AND invited_by = auth.uid());
CREATE POLICY "Members delete invites for their household" ON public.household_invites FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members view household events" ON public.events FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members insert household events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id) AND created_by = auth.uid());
CREATE POLICY "Members update household events" ON public.events FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members delete household events" ON public.events FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members view household uploads" ON public.uploaded_images FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members insert household uploads" ON public.uploaded_images FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id) AND uploaded_by = auth.uid());

INSERT INTO storage.buckets (id, name, public) VALUES ('flyers', 'flyers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view flyer images" ON storage.objects FOR SELECT
  USING (bucket_id = 'flyers');
CREATE POLICY "Authenticated users upload flyers" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'flyers');
CREATE POLICY "Users delete their own flyers" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'flyers' AND owner = auth.uid());
