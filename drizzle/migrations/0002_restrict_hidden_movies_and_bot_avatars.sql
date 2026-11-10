-- hidden_movies: owner-only reads. The public movie catalog is filtered server-side now.
drop policy if exists "Anyone reads hidden movies" on public.hidden_movies;
create policy "Admins read hidden movies" on public.hidden_movies
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
revoke all on public.hidden_movies from anon;
revoke all on public.hidden_movies from authenticated;
grant select, insert, delete on public.hidden_movies to authenticated;
grant all on public.hidden_movies to service_role;

-- bot-avatars: private files, served only through the allow-listed public relay route.
drop policy if exists "Bot avatars public read" on storage.objects;