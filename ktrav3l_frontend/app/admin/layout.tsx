'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar, Table2, Settings, LogOut, FileType, Landmark, Home } from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', icon: Home, url: '/admin/dashboard' },
  { title: 'Calendario', icon: Calendar, url: '/admin/calendar' },
  { title: 'Tabla de Citas', icon: Table2, url: '/admin/appointments' },
  { title: 'Tipos de Cita', icon: FileType, url: '/admin/appointment-types' },
  { title: 'Cuentas Bancarias', icon: Landmark, url: '/admin/bank-accounts' },
  { title: 'Disponibilidad', icon: Settings, url: '/admin/availability' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    // Verificar autenticación
    const token = localStorage.getItem('token');
    if (!token && !pathname?.includes('/admin/login')) {
      router.push('/admin/login');
    }
  }, [pathname, router]);

  if (pathname?.includes('/admin/login')) {
    return <>{children}</>;
  }

  const confirmLogout = () => {
    localStorage.removeItem('token');
    router.push('/admin/login');
    setShowLogoutDialog(false);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="px-4 py-4 flex items-center justify-center">
              <img src="/logo.png" alt="KTravel" className="h-16 w-auto" />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Gestión</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={pathname === item.url}>
                        <a href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="pb-6">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setShowLogoutDialog(true)}>
                  <LogOut />
                  <span>Cerrar Sesión</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="sticky top-0 z-10 bg-white border-b md:hidden">
            <div className="p-4 flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h2 className="text-sm font-semibold">Panel Administrativo</h2>
                <p className="text-xs text-gray-500">Bienvenida Karen</p>
              </div>
            </div>
          </div>
          <div className="p-8">{children}</div>
        </main>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que deseas cerrar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              Serás redirigido a la página de inicio de sesión.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout}>Cerrar sesión</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
