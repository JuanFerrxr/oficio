// Crea datos de prueba en tu Supabase LOCAL: una clienta, un prestador verificado,
// su servicio, horario y la dirección de la clienta. Al final imprime tokens de sesión
// para probar la API con curl. Se puede correr varias veces (reusa lo que ya existe).
//
//   npm run demo
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
if (!/127\.0\.0\.1|localhost/.test(url)) {
  console.error('Este script solo corre contra Supabase local. SUPABASE_URL =', url);
  process.exit(1);
}
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const anon = createClient(url, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const PASSWORD = 'Oficio2026!';

async function ensureUser(email: string, phone: string, full_name: string) {
  const { data: list } = await admin.auth.admin.listUsers();
  const found = list?.users.find((u) => u.email === email);
  if (found) return found.id;
  const { data, error } = await admin.auth.admin.createUser({
    email, phone, password: PASSWORD, email_confirm: true, phone_confirm: true,
    user_metadata: { full_name },
  });
  if (error) throw error;
  return data.user.id;
}

const must = <T>(r: { data: T; error: any }) => { if (r.error) throw r.error; return r.data; };

const mariana = await ensureUser('mariana@demo.mx', '+522224180937', 'Mariana García');
const rogelio = await ensureUser('rogelio@demo.mx', '+522221112233', 'Rogelio Hernández');

const elec = must(await admin.from('categories').select('id').eq('slug', 'electricidad').single()) as { id: number };

must(await admin.from('provider_profiles').upsert({
  user_id: rogelio, headline: 'Electricista residencial', years_experience: 12,
  base_location: 'SRID=4326;POINT(-98.2210 19.0500)', service_radius_km: 8,
  verification_status: 'verified', verified_at: new Date().toISOString(),
  payment_methods: ['cash', 'transfer'],
}));
const svc = must(await admin.from('provider_services').select('id').eq('provider_id', rogelio)) as unknown[];
if (!svc.length) {
  must(await admin.from('provider_services').insert([
    { provider_id: rogelio, category_id: elec.id, title: 'Visita de diagnóstico', price_type: 'fixed', price_mxn: 350 },
    { provider_id: rogelio, category_id: elec.id, title: 'Instalar contacto o apagador', price_type: 'fixed', price_mxn: 250 },
    { provider_id: rogelio, category_id: elec.id, title: 'Cambio de centro de carga', price_type: 'quote' },
  ]));
  must(await admin.from('provider_availability').insert(
    [1, 2, 3, 4, 5, 6].map((weekday) => ({ provider_id: rogelio, weekday, start_time: '08:00', end_time: '19:00' }))));
}
const addr = must(await admin.from('addresses').select('id').eq('user_id', mariana)) as unknown[];
if (!addr.length) {
  must(await admin.from('addresses').insert({
    user_id: mariana, label: 'Casa', street: '25 Sur', ext_number: '1302', neighborhood: 'La Paz',
    municipality: 'Puebla', state: 'Puebla', postal_code: '72160', is_default: true,
    location: 'SRID=4326;POINT(-98.2250 19.0450)',
  }));
}

async function token(email: string) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return data.session!.access_token;
}

console.log('\nListo. Usuarios de prueba (contraseña para ambos: ' + PASSWORD + ')');
console.log('  Clienta:   mariana@demo.mx   id', mariana);
console.log('  Prestador: rogelio@demo.mx   id', rogelio);
console.log('\nTokens de sesión (duran 1 hora):');
console.log('MARIANA=' + (await token('mariana@demo.mx')));
console.log('ROGELIO=' + (await token('rogelio@demo.mx')));
