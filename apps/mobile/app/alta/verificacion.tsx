import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Clock, ShieldCheck } from 'lucide-react-native';
import { Badge, BottomBar, Button, ListGroup, Note, Screen, Title, UploadRow } from '@/components/ui';
import { EncabezadoAlta } from '@/components/prestador/PasoAlta';
import { useSession } from '@/features/auth/session';
import { PASOS, pasoCompleto, useAlta } from '@/features/prestador/alta';
import { DOCUMENTOS, type ClaveDocumento } from '@/features/prestador/documentos';
import { supabase } from '@/lib/supabase';

// B3 · Verifica tu identidad (Paso 5 de 5). Cada fila abre la pantalla para tomar o subir la foto.
// "Enviar a revisión" llama a enviar_a_revision(), que revisa en la base que no falte nada.
// Por ahora nadie aprueba (decisión del Sprint 2): el perfil se queda "En revisión" y no aparece
// en las búsquedas hasta que exista la revisión.
const NOMBRE_FALTANTE: Record<string, string> = {
  perfil: 'tus datos', terminos: 'aceptar los Términos para prestadores', servicios: 'tus servicios',
  zona: 'tu zona de trabajo', horario: 'tu horario', ine_front: 'el frente de tu INE', ine_back: 'el reverso de tu INE',
  selfie: 'tu selfie', proof_of_address: 'tu comprobante de domicilio', criminal_record: 'tu constancia de antecedentes no penales',
};

export default function Verificacion() {
  const { editar } = useLocalSearchParams<{ editar?: string }>();
  const editando = editar === '1';
  const { cambiarModo, refrescarRol } = useSession();
  const { perfil, documentos, servicios, categorias, faltantes, cargando, recargar } = useAlta();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Al regresar de subir un documento, el aviso de "falta…" ya no aplica
  useEffect(() => { setError(null); }, [documentos.length]);

  const estado = perfil?.verification_status ?? 'unverified';
  const subidos = new Set(documentos.map((d) => d.doc_type));
  const pideAntecedentes = servicios.some((s) => categorias.find((c) => c.id === s.category_id)?.requires_background_check);
  const filas: ClaveDocumento[] = ['ine', 'selfie', 'domicilio', ...(pideAntecedentes ? ['antecedentes' as const] : [])];

  async function enviar() {
    setEnviando(true);
    setError(null);
    const { error } = await supabase.rpc('enviar_a_revision');
    setEnviando(false);
    if (error) {
      const faltan = (error.hint ?? '').split(',').filter(Boolean).map((f) => NOMBRE_FALTANTE[f] ?? f);
      setError(faltan.length ? `Antes de enviar, falta: ${faltan.join(', ')}.` : 'No pudimos enviarla. Revisa tu conexión e intenta de nuevo.');
      return;
    }
    await cambiarModo('prestador');
    await refrescarRol();
    await recargar();
    router.replace('/prestador');
  }

  const otrosPasos = PASOS.slice(0, 3).filter((p) => !pasoCompleto(p, faltantes));

  return (
    <Screen
      header={<EncabezadoAlta paso={5} editando={editando} titulo="Verificación de identidad" />}
      footer={
        <BottomBar>
          {estado === 'pending' || estado === 'verified' ? (
            <Button onPress={() => router.replace('/prestador')}>Listo</Button>
          ) : (
            <Button onPress={enviar} loading={enviando} disabled={cargando}>Enviar a revisión</Button>
          )}
        </BottomBar>
      }
    >
      <Title subtitle="Los perfiles verificados reciben más solicitudes. Tus documentos no se muestran a los clientes.">
        Verifica tu identidad
      </Title>
      {error ? <Note tone="error">{error}</Note> : null}
      {otrosPasos.length && estado === 'unverified' ? (
        <Note tone="warning">{`Te falta completar: ${otrosPasos.map((p) => p.titulo.toLowerCase()).join(', ')}.`}</Note>
      ) : null}

      <ListGroup>
        {filas.map((clave, i) => {
          const doc = DOCUMENTOS[clave];
          const listos = doc.partes.filter((p) => subidos.has(p.tipo)).length;
          const completo = listos === doc.partes.length;
          return (
            <UploadRow
              key={clave}
              title={doc.titulo}
              detail={completo ? 'Subida' : listos ? `Falta ${doc.partes.find((p) => !subidos.has(p.tipo))!.etiqueta.toLowerCase()}` : doc.pendiente}
              estado={completo ? 'subido' : 'pendiente'}
              last={i === filas.length - 1}
              onPress={() => router.push({ pathname: '/alta/documento', params: { clave } })}
              testID={`doc-${clave}`}
            />
          );
        })}
      </ListGroup>

      {pideAntecedentes ? null : (
        <Note tone="warning" icon={ShieldCheck}>Para ofrecer Niñeras también se requiere constancia de antecedentes no penales.</Note>
      )}

      {estado === 'pending' ? (
        <View className="flex-row items-center gap-2">
          <Badge tone="warning" icon={Clock}>En revisión</Badge>
          <Text className="flex-1 font-sans text-sm text-muted-foreground">Te avisaremos por correo cuando terminemos.</Text>
        </View>
      ) : null}
      {estado === 'verified' ? <Badge tone="success" icon={ShieldCheck}>Perfil verificado</Badge> : null}
    </Screen>
  );
}
