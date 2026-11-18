// Comprueba el Sprint 1 · Acceso contra tu Supabase LOCAL: que supabase/config.toml, las
// plantillas de correo y la migración del perfil funcionan juntos. No necesita la API.
// Lee los códigos de correo desde Mailpit (http://127.0.0.1:54324).
//
//   npm run acceso
//
// Usa el número de prueba 55 5000 0005 y el correo acceso@prueba.mx: los borra al empezar y al terminar.
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL!;
if (!/127\.0\.0\.1|localhost/.test(URL)) {
  console.error('Este script solo corre contra Supabase local. SUPABASE_URL =', URL);
  process.exit(1);
}
const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const cliente = () => createClient(URL, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

const TEL = '+525550000005';
const CORREO = 'acceso@prueba.mx';
const PASS = 'Oficio2026!';
const NUEVA = 'Nueva2026#';

// Supabase pide esperar entre un SMS y otro al mismo número (auth.sms.max_frequency = "5s").
let ultimoSms = 0;
async function esperarSms() {
  const falta = ultimoSms + 6000 - Date.now();
  if (falta > 0) await new Promise((r) => setTimeout(r, falta));
  ultimoSms = Date.now();
}

let paso = 0;
const check = (cond: unknown, msg: string, detalle?: unknown) => {
  if (!cond) throw new Error(`FALLÓ: ${msg}${detalle ? ` (${JSON.stringify(detalle)})` : ''}`);
  console.log(`  ✔ ${++paso}. ${msg}`);
};

async function limpiar() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) {
    if (u.phone === TEL.slice(1) || u.email === CORREO || u.new_email === CORREO) await admin.auth.admin.deleteUser(u.id);
  }
  await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${CORREO}"`)}`, { method: 'DELETE' }).catch(() => null);
}

/** Espera el correo más reciente para CORREO y devuelve el código de 6 dígitos. */
async function codigoDeCorreo(asunto: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const r = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${CORREO}"`)}`);
    const { messages = [] } = (await r.json()) as { messages?: { ID: string; Subject: string }[] };
    const m = messages.find((x) => x.Subject === asunto);
    if (m) {
      const detalle = (await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json()) as { HTML: string };
      await fetch(`${MAILPIT}/api/v1/messages`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ IDs: [m.ID] }) });
      const codigo = detalle.HTML.match(/>\s*(\d{6})\s*</)?.[1];
      if (codigo) return codigo;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No llegó el correo "${asunto}" a Mailpit (${MAILPIT}). ¿Está encendido Supabase?`);
}

const mp = await fetch(`${MAILPIT}/api/v1/messages`).catch(() => null);
if (!mp?.ok) { console.error(`Mailpit no responde en ${MAILPIT}. Enciende Supabase con "npx supabase start".`); process.exit(1); }
await limpiar();

console.log('\nRegistro (A1.1 → A2.1)\n');
const c = cliente();
let r: any = await c.auth.signUp({ phone: TEL, password: 'oficio2026' });
check(r.error?.code === 'weak_password', 'Rechaza una contraseña sin mayúscula', r.error?.code);
await esperarSms();
r = await c.auth.signUp({
  phone: TEL, password: PASS,
  options: { data: { full_name: 'Prueba Acceso', accepted_terms: true, terms_version: '2026-11', intended_role: 'client' } },
});
check(!r.error && !r.data.session, 'Crea la cuenta con teléfono y contraseña, sin sesión hasta verificar', r.error);
r = await c.auth.verifyOtp({ phone: TEL, token: '000000', type: 'sms' });
check(r.error?.code === 'otp_expired', 'Rechaza un código incorrecto', r.error?.code);
r = await c.auth.verifyOtp({ phone: TEL, token: '123456', type: 'sms' });
check(r.data?.session, 'El código 123456 del número de prueba verifica el teléfono y abre la sesión', r.error);
let { data: perfil } = await c.from('profiles').select('full_name, phone, email, terms_accepted_at, terms_version').single();
check(perfil?.phone === TEL.slice(1) && perfil.full_name === 'Prueba Acceso', 'El perfil tiene el nombre y el teléfono verificado', perfil);
check(perfil?.terms_accepted_at && perfil.terms_version === '2026-11', 'El perfil guarda la aceptación del aviso (hora del servidor y versión)', perfil);

r = await c.auth.updateUser({ email: CORREO });
check(!r.error, 'Agregar el correo manda un código', r.error);
({ data: perfil } = await c.from('profiles').select('full_name, phone, email, terms_accepted_at, terms_version').single());
check(perfil?.email === null, 'El correo NO se guarda en el perfil antes de verificarlo', perfil);
const codigoCorreo = await codigoDeCorreo('Tu código para verificar tu correo');
r = await c.auth.verifyOtp({ email: CORREO, token: codigoCorreo, type: 'email_change' });
check(!r.error, 'El código de 6 dígitos del correo (plantilla verificar-correo.html) lo verifica', r.error);
({ data: perfil } = await c.from('profiles').select('full_name, phone, email, terms_accepted_at, terms_version').single());
check(perfil?.email === CORREO, 'Ya verificado, el correo aparece en el perfil', perfil);
await c.auth.signOut();

console.log('\nEntrar (A0.1, A0.6)\n');
r = await cliente().auth.signInWithPassword({ phone: TEL, password: 'Mala2026!' });
check(r.error?.code === 'invalid_credentials', 'Contraseña incorrecta: invalid_credentials', r.error?.code);
r = await cliente().auth.signInWithPassword({ phone: TEL, password: PASS });
check(r.data?.session, 'Entra con teléfono y contraseña', r.error);
r = await cliente().auth.signInWithPassword({ email: CORREO, password: PASS });
check(r.data?.session, 'Entra con correo y contraseña', r.error);
const c2 = cliente();
await esperarSms();
r = await c2.auth.signInWithOtp({ phone: TEL, options: { shouldCreateUser: false } });
check(!r.error, 'Pide código por SMS para entrar', r.error);
r = await c2.auth.verifyOtp({ phone: TEL, token: '123456', type: 'sms' });
check(r.data?.session, 'Entra con el código', r.error);
r = await cliente().auth.signInWithOtp({ phone: '+525550000003', options: { shouldCreateUser: false } });
check(r.error?.code === 'otp_disabled', 'Un número sin cuenta no recibe código ni crea cuenta', r.error?.code);
await esperarSms();
r = await cliente().auth.signUp({ phone: TEL, password: PASS });
check(!r.error && r.data.user?.identities?.length === 0, 'Registrarse con un teléfono que ya tiene cuenta no crea otra', r.data?.user?.identities);

console.log('\nRecuperar la contraseña (A0.2 → A0.5)\n');
const c3 = cliente();
r = await c3.auth.resetPasswordForEmail(CORREO);
check(!r.error, 'Pide código por correo', r.error);
const codigoRecuperacion = await codigoDeCorreo('Tu código para cambiar tu contraseña');
r = await c3.auth.verifyOtp({ email: CORREO, token: codigoRecuperacion, type: 'recovery' });
check(r.data?.session, 'El código del correo (plantilla recuperar-contrasena.html) abre la sesión', r.error);
r = await c3.auth.updateUser({ password: PASS });
check(r.error?.code === 'same_password', 'No acepta la misma contraseña', r.error?.code);
r = await c3.auth.updateUser({ password: NUEVA });
check(!r.error, 'Guarda la nueva contraseña', r.error);
r = await c3.auth.signOut({ scope: 'others' });
check(!r.error, 'Cierra la sesión en otros dispositivos', r.error);
r = await cliente().auth.signInWithPassword({ phone: TEL, password: NUEVA });
check(r.data?.session, 'Entra con la contraseña nueva', r.error);
const c4 = cliente();
await esperarSms();
r = await c4.auth.signInWithOtp({ phone: TEL, options: { shouldCreateUser: false, channel: 'whatsapp' } });
check(!r.error, 'Pide código por WhatsApp (en local, con Twilio de prueba)', r.error);
r = await c4.auth.verifyOtp({ phone: TEL, token: '123456', type: 'sms' });
check(r.data?.session, 'El código por WhatsApp también abre la sesión', r.error);

await limpiar();
console.log('\nTodo en orden: el acceso funciona como en Figma.\n');
