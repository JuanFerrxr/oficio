-- supabase/seed.sql
-- Se carga solo en local, después de las migraciones, cada vez que corres `npx supabase db reset`.
-- Categorías de arranque + diccionario de búsqueda por problema (A3.0).
-- Los usuarios de prueba se crean con `npm run demo` en apps/api (usa la API de Auth).

insert into categories (slug, name, icon, requires_background_check, sort_order) values
  ('plomeria',     'Plomería',     'droplet',      false, 1),
  ('electricidad', 'Electricidad', 'zap',          false, 2),
  ('pintura',      'Pintura',      'paintbrush',   false, 3),
  ('albanileria',  'Albañilería',  'brick-wall',   false, 4),
  ('carpinteria',  'Carpintería',  'hammer',       false, 5),
  ('nineras',      'Niñeras',      'baby',         true,  6),
  ('limpieza',     'Limpieza',     'sparkles',     false, 7),
  ('jardineria',   'Jardinería',   'leaf',         false, 8);

-- Términos: en minúsculas y sin acentos (la búsqueda aplica unaccent + lower al texto del cliente).
-- Persona B hace crecer esta lista con lo que la gente escribe de verdad en la beta.
insert into category_keywords (category_id, term)
select c.id, t.term from categories c
join (values
  ('plomeria','fuga'), ('plomeria','gotea'), ('plomeria','goteo'), ('plomeria','tuberia'),
  ('plomeria','tinaco'), ('plomeria','boiler'), ('plomeria','calentador'), ('plomeria','wc'),
  ('plomeria','excusado'), ('plomeria','lavabo'), ('plomeria','drenaje'), ('plomeria','tapado'),
  ('plomeria','llave'), ('plomeria','regadera'), ('plomeria','bomba de agua'),
  ('electricidad','pastilla'), ('electricidad','se bota'), ('electricidad','apagador'),
  ('electricidad','contacto'), ('electricidad','enchufe'), ('electricidad','corto'),
  ('electricidad','luz'), ('electricidad','foco'), ('electricidad','lampara'),
  ('electricidad','centro de carga'), ('electricidad','cable'), ('electricidad','chispa'),
  ('electricidad','ventilador de techo'),
  ('pintura','pintar'), ('pintura','pintura'), ('pintura','humedad'), ('pintura','salitre'),
  ('pintura','impermeabilizar'), ('pintura','fachada'), ('pintura','barniz'),
  ('albanileria','grieta'), ('albanileria','cuarteadura'), ('albanileria','barda'),
  ('albanileria','piso'), ('albanileria','azulejo'), ('albanileria','loseta'),
  ('albanileria','muro'), ('albanileria','aplanado'), ('albanileria','colado'),
  ('carpinteria','puerta'), ('carpinteria','closet'), ('carpinteria','mueble'),
  ('carpinteria','cajon'), ('carpinteria','bisagra'), ('carpinteria','madera'),
  ('carpinteria','cocina integral'),
  ('nineras','ninera'), ('nineras','cuidar nino'), ('nineras','cuidar bebe'), ('nineras','nana'),
  ('limpieza','limpiar'), ('limpieza','limpieza'), ('limpieza','aseo'), ('limpieza','lavar alfombra'),
  ('limpieza','mudanza'),
  ('jardineria','pasto'), ('jardineria','jardin'), ('jardineria','podar'), ('jardineria','arbol'),
  ('jardineria','plantas'), ('jardineria','riego')
) as t(slug, term) on t.slug = c.slug;
