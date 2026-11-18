// Qué conversación está abierta en este momento: si llega un aviso de esa misma conversación
// mientras la estás viendo, no se muestra el aviso arriba de la pantalla.
let abierta: string | null = null;
export const fijarChatAbierto = (requestId: string | null) => { abierta = requestId; };
export const chatAbierto = () => abierta;
