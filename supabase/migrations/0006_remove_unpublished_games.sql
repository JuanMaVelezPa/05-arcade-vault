-- 0006 — remove the unpublished prototype catalog entries (none have scores)

delete from public.games
where id in (
  'bloque-buster', 'caida', 'serpentina', 'gloton',
  'invasores', 'rocas', 'ranaria', 'duelo-pixel'
)
and not is_published;
