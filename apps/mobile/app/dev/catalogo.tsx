import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Bell, CircleCheck, Clock, MapPin, Send, ShieldCheck, Trash2, TriangleAlert } from 'lucide-react-native';
import {
  AppBar,
  Avatar,
  Badge,
  Button,
  Checkbox,
  Chip,
  ListGroup,
  ListRow,
  Logo,
  Note,
  OTPInput,
  ProgressBar,
  Screen,
  SegmentedControl,
  TextField,
  Title,
} from '@/components/ui';

// Todos los componentes base con sus variantes, para compararlos lado a lado con la página
// "Fundamentos y componentes" de Figma. Si algo no coincide, se corrige aquí antes de usarlo
// en pantallas: así el arreglo llega a todas las pantallas a la vez.

function Seccion({ titulo, figma, children }: { titulo: string; figma: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-display text-lg text-foreground">{titulo}</Text>
        <Text className="font-sans-medium text-xs text-muted-foreground">Figma: {figma}</Text>
      </View>
      {children}
    </View>
  );
}

const SEGMENTOS = [
  { value: 'nuevas', label: 'Nuevas' },
  { value: 'activas', label: 'Activas' },
  { value: 'historial', label: 'Historial' },
] as const;

export default function Catalogo() {
  const [chip, setChip] = useState('Esta semana');
  const [segmento, setSegmento] = useState<(typeof SEGMENTOS)[number]['value']>('nuevas');
  const [acepto, setAcepto] = useState(true);
  const [codigo, setCodigo] = useState('4812');
  const [paso, setPaso] = useState(2);

  return (
    <Screen header={<AppBar title="Catálogo de componentes" />}>
      <Seccion titulo="Tipografía" figma="Estilos de texto">
        <Logo />
        <Title subtitle="body/base · Figtree 400">heading/2xl · Bricolage 700</Title>
        <Text className="font-display text-xl text-foreground">heading/xl</Text>
        <Text className="font-display text-lg text-foreground">heading/lg</Text>
        <Text className="font-sans-bold text-base text-foreground">body/base-bold</Text>
        <Text className="font-sans text-sm text-muted-foreground">body/sm · muted-foreground</Text>
        <Text className="font-sans-medium text-xs text-muted-foreground">caption/xs</Text>
      </Seccion>

      <Seccion titulo="Button" figma="Button">
        <Button>Primario</Button>
        <Button variant="secondary">Secundario</Button>
        <Button variant="accent">Acento</Button>
        <Button variant="destructive" icon={Trash2}>
          Cancelar solicitud
        </Button>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button size="sm" icon={Send}>
              Chico
            </Button>
          </View>
          <View className="flex-1">
            <Button size="sm" variant="secondary" loading>
              Cargando
            </Button>
          </View>
          <View className="flex-1">
            <Button size="sm" disabled>
              Inactivo
            </Button>
          </View>
        </View>
        <Button variant="ghost">Enlace</Button>
      </Seccion>

      <Seccion titulo="TextField" figma="TextField">
        <TextField label="Nombre completo" placeholder="Como aparece en tu INE" />
        <TextField label="Teléfono" prefix="+52" keyboardType="phone-pad" placeholder="222 418 0937" />
        <TextField label="Contraseña" password defaultValue="Oficio2026!" hint="Mínimo 8 caracteres" />
        <TextField label="Correo" defaultValue="mariana@" error="Escribe un correo válido" />
      </Seccion>

      <Seccion titulo="Chip" figma="Chip">
        <View className="flex-row flex-wrap gap-2">
          {['Urgente', 'Esta semana', 'Sin prisa'].map((c) => (
            <Chip key={c} selected={chip === c} onPress={() => setChip(c)}>
              {c}
            </Chip>
          ))}
        </View>
      </Seccion>

      <Seccion titulo="Badge" figma="Badge">
        <View className="flex-row flex-wrap gap-2">
          <Badge tone="success" icon={ShieldCheck}>
            INE verificada
          </Badge>
          <Badge tone="warning" icon={Clock}>
            En revisión
          </Badge>
          <Badge tone="primary">Programada</Badge>
          <Badge tone="danger" icon={TriangleAlert}>
            Responde en 1 h 38 min
          </Badge>
        </View>
      </Seccion>

      <Seccion titulo="Avatar" figma="Avatar · size · tone">
        <View className="flex-row items-end gap-3">
          <Avatar name="Rogelio Hernández" tone={1} />
          <Avatar name="Jorge Cuautle" tone={2} />
          <Avatar name="Lucía Morales" tone={3} />
          <Avatar name="Mariana García" tone={4} />
          <Avatar name="Rogelio Hernández" size="lg" tone={1} />
          <Avatar name="Rogelio Hernández" size="xl" tone={1} />
        </View>
      </Seccion>

      <Seccion titulo="ProgressBar" figma="ProgressBar">
        <Text className="font-sans-semibold text-sm text-muted-foreground">Paso {paso} de 4</Text>
        <ProgressBar step={paso} total={4} />
        <View className="flex-row gap-2">
          {[1, 2, 3, 4].map((n) => (
            <Chip key={n} selected={paso === n} onPress={() => setPaso(n)}>
              {String(n)}
            </Chip>
          ))}
        </View>
      </Seccion>

      <Seccion titulo="OTPInput" figma="OTPCell × 6">
        <OTPInput value={codigo} onChange={setCodigo} />
        <OTPInput value="123456" onChange={() => {}} error />
      </Seccion>

      <Seccion titulo="SegmentedControl" figma="SegmentedControl">
        <SegmentedControl options={SEGMENTOS} value={segmento} onChange={setSegmento} />
      </Seccion>

      <Seccion titulo="Checkbox" figma="Checkbox">
        <Checkbox checked={acepto} onChange={setAcepto}>
          <Text className="font-sans text-sm text-foreground">Acepto el aviso de privacidad y los términos.</Text>
        </Checkbox>
      </Seccion>

      <Seccion titulo="Note" figma="Note · tone">
        <Note>Rogelio confirma precio y hora. El pago es directo con él.</Note>
        <Note tone="privacy">Tu número solo se comparte con el prestador cuando confirmas una cita.</Note>
        <Note tone="warning">Una solicitud cancelada no se puede reactivar.</Note>
      </Seccion>

      <Seccion titulo="ListRow" figma="ListRow">
        <ListGroup>
          <ListRow icon={MapPin} title="Mis direcciones" value="2" onPress={() => {}} />
          <ListRow icon={Bell} title="Notificaciones" onPress={() => {}} />
          <ListRow icon={CircleCheck} title="Verificación" value="Completa" chevron={false} />
          <ListRow icon={Trash2} title="Eliminar cuenta" destructive onPress={() => {}} last />
        </ListGroup>
      </Seccion>
    </Screen>
  );
}
