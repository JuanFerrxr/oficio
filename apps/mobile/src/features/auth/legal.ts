import { router } from 'expo-router';

// El Aviso de privacidad y los Términos se redactan aparte (pendiente legal antes de la beta).
// Cuando estén publicados, cambia esto por Linking.openURL('https://…') o una pantalla con el texto.
export function abrirLegal(cual: 'aviso' | 'terminos') {
  router.push({
    pathname: '/proximamente',
    params:
      cual === 'aviso'
        ? { code: 'Legal', title: 'Aviso de privacidad', description: 'Texto del aviso de privacidad integral (LFPDPPP). Versión que se acepta al registrarse: 2026-11.', sprint: '4' }
        : { code: 'Legal', title: 'Términos y condiciones', description: 'Términos y condiciones de uso de Oficio. Versión que se acepta al registrarse: 2026-11.', sprint: '4' },
  });
}
