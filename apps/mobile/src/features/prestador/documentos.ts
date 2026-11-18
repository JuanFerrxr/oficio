// B3 · Documentos de verificación. `tipos` son los doc_type de verification_documents.
export type DocTipo = 'ine_front' | 'ine_back' | 'selfie' | 'proof_of_address' | 'criminal_record';

export const DOCUMENTOS = {
  ine: {
    titulo: 'INE (frente y reverso)',
    pendiente: 'Credencial para votar vigente',
    instrucciones: 'Toma la foto sobre una superficie lisa, con buena luz y sin reflejos. Que se lean todos los datos.',
    partes: [
      { tipo: 'ine_front', etiqueta: 'Frente' },
      { tipo: 'ine_back', etiqueta: 'Reverso' },
    ],
    soloCamara: false,
    frontal: false,
  },
  selfie: {
    titulo: 'Selfie de verificación',
    pendiente: 'Una foto de tu cara, tomada en este momento',
    instrucciones: 'Mira de frente a la cámara, con buena luz, sin lentes oscuros ni gorra. La comparamos con la foto de tu INE.',
    partes: [{ tipo: 'selfie', etiqueta: 'Tu selfie' }],
    soloCamara: true,
    frontal: true,
  },
  domicilio: {
    titulo: 'Comprobante de domicilio',
    pendiente: 'Recibo de luz, agua o teléfono',
    instrucciones: 'De los últimos 3 meses. Que se vean tu nombre (o el de tu familia), la dirección y la fecha.',
    partes: [{ tipo: 'proof_of_address', etiqueta: 'Comprobante' }],
    soloCamara: false,
    frontal: false,
  },
  antecedentes: {
    titulo: 'Constancia de antecedentes no penales',
    pendiente: 'Necesaria para ofrecer Niñeras',
    instrucciones: 'La expide la Fiscalía General del Estado. Debe tener menos de 6 meses.',
    partes: [{ tipo: 'criminal_record', etiqueta: 'Constancia' }],
    soloCamara: false,
    frontal: false,
  },
} as const satisfies Record<string, {
  titulo: string; pendiente: string; instrucciones: string;
  partes: readonly { tipo: DocTipo; etiqueta: string }[]; soloCamara: boolean; frontal: boolean;
}>;

export type ClaveDocumento = keyof typeof DOCUMENTOS;
