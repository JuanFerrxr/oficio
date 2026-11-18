import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, Repeat } from 'lucide-react-native';
import { Button, Screen, SegmentedControl } from '@/components/ui';
import { isoDe, isoEnDias } from '@/features/cliente/formato';
import {
  COLOR_EVENTO, INICIALES, SOMBRA_NO_DISPONIBLE, columnas, cuadriculaMes, detalleEvento, diaSemanaIso, eventosDelDia, inicioMes, inicioSemana, minutos,
  numeroDe, sumarDias, sumarMeses, tituloDia, tituloEvento, tituloMes, tituloSemana, useCalendario, type Evento, type Vista,
} from '@/features/prestador/calendario';
import { colors } from '@/theme/colors';

// B6.1 Día · B6.2 Semana · B6.3 Mes. Citas confirmadas (verde), cotizaciones esperando
// confirmación (azul) y horas no disponibles (gris). "Bloquear" abre B6.4.
const ALTO_HORA = 56;

export default function Calendario() {
  const hoy = isoEnDias(0);
  const [vista, setVista] = useState<Vista>('dia');
  const [dia, setDia] = useState(hoy);

  // Rango que se pide a la base según la vista
  const [desde, hasta] = useMemo(() => {
    if (vista === 'dia') return [dia, dia];
    if (vista === 'semana') { const l = inicioSemana(dia); return [l, sumarDias(l, 6)]; }
    const g = cuadriculaMes(dia);
    return [g[0][0], g[g.length - 1][6]];
  }, [vista, dia]);
  const { eventos, diasLibres, horario, cargando, recargar } = useCalendario(desde, hasta);
  useEffect(() => { recargar(); }, [recargar]);

  const mover = (n: number) => setDia((d) => (vista === 'dia' ? sumarDias(d, n) : vista === 'semana' ? sumarDias(d, 7 * n) : sumarMeses(inicioMes(d), n)));
  const titulo = vista === 'dia' ? tituloDia(dia) : vista === 'semana' ? tituloSemana(inicioSemana(dia)) : tituloMes(dia);
  const abrir = (e: Evento) => (e.tipo === 'no_disponible'
    ? router.push({ pathname: '/bandeja/bloquear', params: { id: e.id } })
    : router.push({ pathname: '/bandeja/[id]', params: { id: e.id } }));

  const encabezado = (
    <View className="h-[52px] flex-row items-center justify-between px-5">
      <Text className="font-display text-lg text-foreground">Calendario</Text>
      <View className="w-28"><Button size="sm" variant="secondary" onPress={() => router.push({ pathname: '/bandeja/bloquear', params: { dia: dia < hoy ? hoy : dia } })}>Bloquear</Button></View>
    </View>
  );

  return (
    <Screen header={encabezado}>
      <SegmentedControl options={[{ value: 'dia', label: 'Día' }, { value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mes' }] as const} value={vista} onChange={setVista} />

      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => mover(-1)} hitSlop={12} accessibilityLabel="Anterior"><ChevronLeft size={22} color={colors.foreground} /></Pressable>
        <Pressable onPress={() => setDia(hoy)} accessibilityRole="button" accessibilityLabel="Ir a hoy">
          <Text className="font-sans-bold text-base text-foreground" testID="titulo-calendario">{titulo}</Text>
        </Pressable>
        <Pressable onPress={() => mover(1)} hitSlop={12} accessibilityLabel="Siguiente"><ChevronRight size={22} color={colors.foreground} /></Pressable>
      </View>

      <View className="flex-row flex-wrap gap-4">
        {[['confirmada', 'Confirmada'], ['por_confirmar', 'Por confirmar'], ['no_disponible', 'No disponible']].map(([k, t]) => (
          <View key={k} className="flex-row items-center gap-1.5">
            {k === 'no_disponible'
              ? <View className="h-3 w-3 rounded-sm" style={{ backgroundColor: SOMBRA_NO_DISPONIBLE }} />
              : <View className={`h-3 w-3 rounded-sm border-l-4 ${COLOR_EVENTO[k].fondo} ${COLOR_EVENTO[k].borde}`} />}
            <Text className="font-sans text-xs text-muted-foreground">{t}</Text>
          </View>
        ))}
      </View>

      {cargando ? <View className="items-center py-8"><ActivityIndicator color={colors.primary} /></View> : null}
      {!cargando && vista === 'dia' ? <VistaDia dia={dia} eventos={eventosDelDia(eventos, dia)} horario={horario} libre={diasLibres.includes(diaSemanaIso(dia))} onEvento={abrir} /> : null}
      {!cargando && vista === 'semana' ? <VistaSemana lunes={inicioSemana(dia)} eventos={eventos} horario={horario} libres={diasLibres} onDia={(d) => { setDia(d); setVista('dia'); }} /> : null}
      {!cargando && vista === 'mes' ? <VistaMes dia={dia} eventos={eventos} libres={diasLibres} onDia={setDia} onEvento={abrir} /> : null}
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// B6.1 · Día: horas a la izquierda y cada evento en su lugar
// ---------------------------------------------------------------------------
function VistaDia({ dia, eventos, horario, libre, onEvento }: { dia: string; eventos: Evento[]; horario: { desde: number; hasta: number }; libre: boolean; onEvento: (e: Evento) => void }) {
  const todoElDia = eventos.filter((e) => e.all_day);
  const sombreado = todoElDia.length > 0 || libre;
  // En un día sombreado no se muestran los bloqueos que se repiten (la comida de cada día)
  const conHora = eventos.filter((e) => !e.all_day && !(sombreado && e.tipo === 'no_disponible' && e.rrule)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const cols = columnas(conHora);
  const horas = Array.from({ length: horario.hasta - horario.desde }, (_, i) => horario.desde + i);
  const ahora = minutos(new Date().toISOString());
  return (
    <View className="gap-3" testID="vista-dia">
      {libre ? <Text className="font-sans text-sm text-muted-foreground">Según tu horario, este día no trabajas.</Text> : null}
      {todoElDia.map((e) => <EventoTarjeta key={e.id + e.starts_at} e={e} onPress={() => onEvento(e)} />)}
      <View className="flex-row">
        <View className="w-12">
          {horas.map((h) => <Text key={h} style={{ height: ALTO_HORA }} className="font-sans text-xs text-muted-foreground">{`${String(h).padStart(2, '0')}:00`}</Text>)}
        </View>
        <View className="flex-1" style={{ height: horas.length * ALTO_HORA }}>
          {sombreado ? <View className="absolute inset-0 rounded-lg" style={{ backgroundColor: SOMBRA_NO_DISPONIBLE }} testID="dia-sombreado" /> : null}
          {horas.map((h, i) => <View key={h} className="absolute left-0 right-0 border-t border-border" style={{ top: i * ALTO_HORA }} />)}
          {dia === isoEnDias(0) && ahora >= horario.desde * 60 && ahora < horario.hasta * 60 ? (
            <View className="absolute left-0 right-0 h-0.5 bg-danger" style={{ top: ((ahora - horario.desde * 60) / 60) * ALTO_HORA }} />
          ) : null}
          {conHora.map((e, i) => {
            const ini = Math.max(minutos(e.starts_at), horario.desde * 60);
            const fin = isoDe(e.ends_at) > dia ? horario.hasta * 60 : Math.min(minutos(e.ends_at) || 24 * 60, horario.hasta * 60);
            const top = ((ini - horario.desde * 60) / 60) * ALTO_HORA;
            const alto = Math.max(40, ((fin - ini) / 60) * ALTO_HORA - 2);
            return (
              <View key={e.id + e.starts_at} className="absolute pr-1" style={{ top, height: alto, left: `${(cols[i].col / cols[i].de) * 100}%`, width: `${100 / cols[i].de}%` }}>
                <EventoTarjeta e={e} onPress={() => onEvento(e)} llena />
              </View>
            );
          })}
        </View>
      </View>
      {!eventos.length ? <Text className="text-center font-sans text-sm text-muted-foreground">Nada agendado. Toca “Bloquear” si no vas a trabajar alguna hora.</Text> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// B6.2 · Semana: 7 columnas con bloques de color; tocar un día abre su vista de día
// ---------------------------------------------------------------------------
function VistaSemana({ lunes, eventos, horario, libres, onDia }: { lunes: string; eventos: Evento[]; horario: { desde: number; hasta: number }; libres: number[]; onDia: (d: string) => void }) {
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const alto = 26;
  const marcas = Array.from({ length: Math.floor((horario.hasta - horario.desde) / 2) + 1 }, (_, i) => horario.desde + i * 2);
  const hoy = isoEnDias(0);
  return (
    <View className="gap-1" testID="vista-semana">
      <View className="flex-row pl-7">
        {dias.map((d, i) => (
          <Pressable key={d} onPress={() => onDia(d)} className="flex-1 items-center gap-0.5" accessibilityRole="button" accessibilityLabel={tituloDia(d)}>
            <Text className="font-sans text-xs text-muted-foreground">{INICIALES[i]}</Text>
            <View className={`h-7 w-7 items-center justify-center rounded-full ${d === hoy ? 'bg-primary' : ''}`}>
              <Text className={`font-sans-bold text-sm ${d === hoy ? 'text-primary-foreground' : 'text-foreground'}`}>{numeroDe(d)}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <View className="flex-row">
        <View className="w-7">
          {marcas.map((h) => <Text key={h} style={{ height: alto * 2 }} className="font-sans text-[10px] text-muted-foreground">{h}</Text>)}
        </View>
        {dias.map((d) => {
          // Día bloqueado completo o que no trabaja: toda la columna sombreada
          const bloqueado = eventosDelDia(eventos, d).some((e) => e.all_day);
          const noDisp = bloqueado || libres.includes(diaSemanaIso(d));
          return (
          <Pressable key={d} onPress={() => onDia(d)} className="mx-px flex-1 overflow-hidden rounded bg-card"
            style={{ height: (horario.hasta - horario.desde) * alto }} accessibilityLabel={`Ver ${tituloDia(d)}${noDisp ? ', no disponible' : ''}`}
            testID={noDisp ? `semana-no-disponible-${d}` : undefined}>
            {noDisp ? (
              <View className="absolute inset-0 items-center pt-1" style={{ backgroundColor: SOMBRA_NO_DISPONIBLE }}>
                <Text className="font-sans text-[9px] text-muted-foreground">No disp.</Text>
              </View>
            ) : null}
            {/* En un día sombreado no se repiten los bloqueos de unas horas (la comida, por ejemplo) */}
            {eventosDelDia(eventos, d).filter((e) => !e.all_day && !(noDisp && e.tipo === 'no_disponible')).map((e) => {
              const ini = Math.max(minutos(e.starts_at), horario.desde * 60);
              const fin = Math.min(minutos(e.ends_at) || 24 * 60, horario.hasta * 60);
              if (fin <= horario.desde * 60 || ini >= horario.hasta * 60) return null;
              return (
                <View key={e.id + e.starts_at} className={`absolute left-0.5 right-0.5 rounded border-l-2 ${COLOR_EVENTO[e.tipo].fondo} ${COLOR_EVENTO[e.tipo].borde}`}
                  style={{ top: ((ini - horario.desde * 60) / 60) * alto, height: Math.max(10, ((fin - ini) / 60) * alto - 1) }} />
              );
            })}
          </Pressable>
          );
        })}
      </View>
      <Text className="pt-2 font-sans text-xs text-muted-foreground">Toca un día para verlo completo. Los días sombreados no estás disponible (bloqueados o sin horario).</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// B6.3 · Mes: días con puntos de color; abajo, lo del día elegido
// ---------------------------------------------------------------------------
function VistaMes({ dia, eventos, libres, onDia, onEvento }: { dia: string; eventos: Evento[]; libres: number[]; onDia: (d: string) => void; onEvento: (e: Evento) => void }) {
  const semanas = cuadriculaMes(dia);
  const mes = dia.slice(0, 7);
  const hoy = isoEnDias(0);
  const delDia = eventosDelDia(eventos, dia).sort((a, b) => Number(b.all_day) - Number(a.all_day) || a.starts_at.localeCompare(b.starts_at));
  return (
    <View className="gap-3" testID="vista-mes">
      <View className="gap-1">
        <View className="flex-row">{INICIALES.map((l, i) => <Text key={i} className="flex-1 text-center font-sans text-xs text-muted-foreground">{l}</Text>)}</View>
        {semanas.map((s) => (
          <View key={s[0]} className="flex-row">
            {s.map((d) => {
              const evs = eventosDelDia(eventos, d);
              const noDisp = evs.some((e) => e.all_day) || libres.includes(diaSemanaIso(d));
              const fuera = d.slice(0, 7) !== mes;
              const sel = d === dia;
              // Puntos: citas, y bloqueos de unas horas que no se repiten (la comida de cada día no ensucia el mes)
              const tipos = [...new Set(evs.filter((e) => !e.all_day && !(e.tipo === 'no_disponible' && e.rrule)).map((e) => e.tipo))];
              return (
                <Pressable key={d} onPress={() => onDia(d)} className="flex-1 items-center py-0.5" accessibilityRole="button" accessibilityLabel={`${tituloDia(d)}${noDisp ? ', no disponible' : ''}`} testID={`dia-${d}`}>
                  <View className={`h-10 w-10 items-center justify-center rounded-xl ${sel ? 'bg-primary' : ''} ${d === hoy && !sel ? 'border border-primary' : ''}`}
                    style={noDisp && !fuera && !sel ? { backgroundColor: SOMBRA_NO_DISPONIBLE } : undefined}>
                    <Text className={`font-sans-bold text-sm ${sel ? 'text-primary-foreground' : fuera ? 'text-border' : noDisp ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{numeroDe(d)}</Text>
                  </View>
                  <View className="h-1.5 flex-row gap-0.5">
                    {tipos.map((t) => <View key={t} className={`h-1.5 w-1.5 rounded-full ${t === 'confirmada' ? 'bg-success' : t === 'por_confirmar' ? 'bg-primary' : 'bg-muted-foreground'}`} />)}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <Text className="font-sans-bold text-sm text-muted-foreground">{`${tituloDia(dia)} · ${delDia.length} ${delDia.length === 1 ? 'evento' : 'eventos'}`}</Text>
      {delDia.map((e) => <EventoTarjeta key={e.id + e.starts_at} e={e} onPress={() => onEvento(e)} />)}
    </View>
  );
}

// Figma: CalendarEvent · Título · Detalle
function EventoTarjeta({ e, onPress, llena }: { e: Evento; onPress: () => void; llena?: boolean }) {
  const c = COLOR_EVENTO[e.tipo];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" testID={`evento-${e.tipo}`}
      className={`gap-0.5 overflow-hidden rounded-lg border-l-4 px-2.5 py-1.5 active:opacity-80 ${c.fondo} ${c.borde} ${llena ? 'h-full' : ''}`}>
      <View className="flex-row items-center gap-1">
        <Text numberOfLines={1} className={`flex-1 font-sans-bold text-xs ${c.texto}`}>{tituloEvento(e)}</Text>
        {e.rrule ? <Repeat size={11} color={colors.mutedForeground} /> : null}
      </View>
      <Text numberOfLines={1} className="font-sans text-xs text-foreground">{detalleEvento(e)}</Text>
    </Pressable>
  );
}
