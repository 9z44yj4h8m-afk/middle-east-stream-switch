-- The owner's panel needs to see and remove its own avatar files; visitors still get
-- pictures only through the allow-listed relay route.
create policy "Bot avatars admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'bot-avatars' and public.has_role(auth.uid(), 'admin'));