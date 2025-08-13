import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Brain,
  FileText,
  Users,
  TrendingUp,
  Settings,
  Target,
  LineChart,
  DollarSign,
  MessageCircle,
  Zap,
  Menu,
  ChevronRight
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarProvider
} from '@/components/ui/sidebar';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/utils';

const menuGroups = [
  {
    label: 'Overview',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Business Plan' },
      { path: '/dashboard', icon: DollarSign, label: 'Dashboard' },
    ],
  },
  {
    label: 'AI Analytics',
    items: [
      { path: '/document-memory', icon: MessageCircle, label: 'AI Document Memory' },
      { path: '/ai-processing', icon: Brain, label: 'AI Processing' },
      { path: '/metrics', icon: TrendingUp, label: 'Metrics' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { path: '/proforma', icon: LineChart, label: 'Financial Proforma' },
      { path: '/strategy', icon: Target, label: 'Strategy' },
      { path: '/documents', icon: FileText, label: 'Documents' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: '/customers', icon: Users, label: 'Customers' },
      { path: '/integrations', icon: Zap, label: 'API Integrations' },
      { path: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export function ModernSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="border-r-0 bg-background">
      <SidebarHeader className="border-b-0 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Syna AI</h2>
              <p className="text-xs text-muted-foreground">© 2025 Syna AI</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        {menuGroups.map((group, index) => (
          <SidebarGroup key={group.label} className="border-b-0">
            {index === 0 && <div className="h-2" />}
            <div className="px-2 pb-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">{group.label}</p>
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path || 
                    (item.path === '/proforma' && location.pathname.startsWith('/proforma')) ||
                    (item.path === '/integrations' && location.pathname.startsWith('/integrations'));
                  
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton 
                        asChild 
                        className={cn(
                          "h-9 px-3 rounded-lg transition-all duration-200",
                          "hover:bg-accent/50 hover:shadow-sm",
                          isActive && "bg-primary/10 text-primary font-medium hover:bg-primary/15"
                        )}
                      >
                        <Link to={item.path}>
                          <item.icon className={cn(
                            "h-4 w-4 transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )} />
                          <span className="text-sm">{item.label}</span>
                          {isActive && (
                            <ChevronRight className="ml-auto h-3 w-3 text-primary opacity-60" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      
      <SidebarFooter className="border-t-0 mt-auto">
        <div className="p-4">
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Powered by advanced AI orchestration
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function ModernLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  
  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <div className="flex h-screen w-full bg-background">
        <ModernSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hover:bg-accent/50 rounded-lg p-2 transition-all duration-200"
            >
              <Menu className="h-4 w-4" />
            </SidebarTrigger>
            <div className="ml-auto flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Dashboard</span>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-muted/20">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}