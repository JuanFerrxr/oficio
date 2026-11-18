import { Tabs } from 'expo-router';
import { ClipboardList, House, MessageCircle, User } from 'lucide-react-native';
import { tabBarOptions, tabIcon } from '@/navigation/tabs';

// Pestañas del cliente: Inicio · Solicitudes · Mensajes · Perfil
export default function ClientTabs() {
  return (
    <Tabs screenOptions={tabBarOptions}>
      <Tabs.Screen name="home" options={{ title: 'Inicio', tabBarIcon: tabIcon(House) }} />
      <Tabs.Screen name="requests" options={{ title: 'Solicitudes', tabBarIcon: tabIcon(ClipboardList) }} />
      <Tabs.Screen name="messages" options={{ title: 'Mensajes', tabBarIcon: tabIcon(MessageCircle) }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: tabIcon(User) }} />
    </Tabs>
  );
}
