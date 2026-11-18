import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { TextLink } from '@/components/ui';

// "¿No llegó? Reenviar en 0:42 · Recibir por WhatsApp"
// La cuenta regresiva evita pedir códigos sin parar (Supabase también lo limita).
type Props = {
  onReenviar: () => Promise<boolean>;
  alterna?: { texto: string; onPress: () => void };
  segundos?: number;
};

export function Reenviar({ onReenviar, alterna, segundos = 60 }: Props) {
  const [faltan, setFaltan] = useState(segundos);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (faltan <= 0) return;
    const t = setTimeout(() => setFaltan((f) => f - 1), 1000);
    return () => clearTimeout(t);
  }, [faltan]);

  const reloj = `${Math.floor(faltan / 60)}:${String(faltan % 60).padStart(2, '0')}`;

  return (
    <Text className="text-center font-sans text-sm text-muted-foreground">
      ¿No llegó?{' '}
      {faltan > 0 ? (
        `Reenviar en ${reloj}`
      ) : (
        <TextLink
          disabled={enviando}
          onPress={async () => {
            setEnviando(true);
            const ok = await onReenviar();
            setEnviando(false);
            if (ok) setFaltan(segundos);
          }}
        >
          Reenviar
        </TextLink>
      )}
      {alterna ? (
        <>
          {'  ·  '}
          <TextLink onPress={alterna.onPress}>{alterna.texto}</TextLink>
        </>
      ) : null}
    </Text>
  );
}
