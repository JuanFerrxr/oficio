import { Tabs } from 'expo-router';
import { CalendarDays, ClipboardList, MessageCircle, Star, User } from 'lucide-react-native';
import { tabBarOptions, tabIcon } from '@/navigation/tabs';
import { useNoLeidos } from '@/features/chat/chat';

// Pestañas del prestador: Solicitudes · Calendario · Mensajes · Reseñas · Perfil
// Es una carpeta normal (no un grupo entre paréntesis) porque sus pantallas se llaman igual
// que las del cliente (messages, profile): las rutas quedan /prestador/messages, etc.
export default function ProviderTabs() {
  // Insignia con los mensajes sin leer (Sprint 4B)
  const noLeidos = useNoLeidos();
  return (
    <Tabs screenOptions={tabBarOptions}>
      <Tabs.Screen name="index" options={{ title: 'Solicitudes', tabBarIcon: tabIcon(ClipboardList) }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendario', tabBarIcon: tabIcon(CalendarDays) }} />
      <Tabs.Screen name="messages" options={{ title: 'Mensajes', tabBarIcon: tabIcon(MessageCircle), tabBarBadge: noLeidos ? (noLeidos > 9 ? '9+' : noLeidos) : undefined }} />
      <Tabs.Screen name="reviews" options={{ title: 'Reseñas', tabBarIcon: tabIcon(Star) }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: tabIcon(User) }} />
    </Tabs>
  );
}
