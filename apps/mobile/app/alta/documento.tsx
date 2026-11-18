import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck, ShieldCheck } from 'lucide-react-native';
import { AppBar, BottomBar, Button, Note, Screen, Title } from '@/components/ui';
import { OpcionesFoto } from '@/components/prestador/OpcionesFoto';
import { useSession } from '@/features/auth/session';
import { subirFoto, type Foto } from '@/features/prestador/archivos';
import { DOCUMENTOS, type ClaveDocumento, type DocTipo } from '@/features/prestador/documentos';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

// B3 · Tomar o subir un documento. Cada foto se sube en cuanto se elige, al bucket privado
// "verification" (verification/<tu id>/ine_front.jpg…). Solo tú puedes verla; Oficio la revisa
// con la llave de servicio. Si tomas otra, reemplaza a la anterior.
export default function Documento() {
  const { clave } = useLocalSearchParams<{ clave: ClaveDocumento }>();
  const doc = DOCUMENTOS[clave ?? 'ine'] ?? DOCUMENTOS.ine;
  const { session } = useSession();
  const uid = session?.user.id;
  const [vistas, setVistas] = useState<Partial<Record<DocTipo, string>>>({});
  const [subiendo, setSubiendo] = useState<DocTipo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Muestra lo que ya estaba subido (enlace temporal de 5 minutos: el bucket es privado)
  useEffect(() => {
    if (!uid) return;
    supabase.from('verification_documents').select('doc_type, storage_path')
      .eq('provider_id', uid).in('doc_type', doc.partes.map((p) => p.tipo))
      .then(async ({ data }) => {
        const res: Partial<Record<DocTipo, string>> = {};
        for (const d of data ?? []) {
          if (!d.storage_path || res[d.doc_type as DocTipo]) continue;
          const firmada = await supabase.storage.from('verification').createSignedUrl(d.storage_path, 300);
          if (firmada.data) res[d.doc_type as DocTipo] = firmada.data.signedUrl;
        }
        setVistas((v) => ({ ...res, ...v }));
      });
  }, [uid, doc]);

  async function guardar(tipo: DocTipo, foto: Foto) {
    if (!uid) return;
    setSubiendo(tipo);
    setError(null);
    try {
      const ruta = await subirFoto('verification', `${uid}/${tipo}`, foto);
      // Un registro por documento: se borra el anterior sin revisar y se apunta al nuevo
      const borrar = await supabase.from('verification_documents').delete().eq('provider_id', uid).eq('doc_type', tipo).eq('status', 'pending');
      if (borrar.error) throw borrar.error;
      const { error } = await supabase.from('verification_documents').insert({ provider_id: uid, doc_type: tipo, storage_path: ruta });
      if (error) throw error;
      setVistas((v) => ({ ...v, [tipo]: foto.uri }));
    } catch {
      setError('No pudimos subir la foto. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setSubiendo(null);
    }
  }

  const completo = doc.partes.every((p) => vistas[p.tipo]);

  return (
    <Screen
      header={<AppBar title={doc.titulo} />}
      footer={<BottomBar><Button onPress={() => router.back()} disabled={!completo || !!subiendo}>Listo</Button></BottomBar>}
    >
      <Title subtitle={doc.instrucciones}>{doc.titulo}</Title>
      {error ? <Note tone="error">{error}</Note> : null}
      {doc.partes.map((p) => (
        <View key={p.tipo} className="gap-2" testID={`parte-${p.tipo}`}>
          <View className="flex-row items-center gap-2">
            {vistas[p.tipo] ? <CircleCheck size={18} color={colors.success} /> : null}
            <Text className="font-sans-semibold text-base text-foreground">{p.etiqueta}</Text>
          </View>
          {vistas[p.tipo] ? (
            <Image source={{ uri: vistas[p.tipo] }} style={{ width: '100%', height: doc.frontal ? 260 : 200, borderRadius: 12 }} resizeMode="cover" />
          ) : null}
          <OpcionesFoto
            onFoto={(f) => guardar(p.tipo, f)}
            frontal={doc.frontal}
            soloCamara={doc.soloCamara}
            textoCamara={vistas[p.tipo] ? 'Tomar otra' : 'Tomar foto'}
            cargando={subiendo === p.tipo}
          />
        </View>
      ))}
      <Note tone="privacy" icon={ShieldCheck}>Tus documentos no se muestran a los clientes. Solo los usamos para verificar tu identidad.</Note>
    </Screen>
  );
}
