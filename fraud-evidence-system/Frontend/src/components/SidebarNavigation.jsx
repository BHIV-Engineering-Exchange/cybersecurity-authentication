import React, { useState } from 'react';
import { 
  Home, 
  FolderOpen, 
  AlertTriangle, 
  FileText, 
  Phone, 
  FileBarChart,
  Users,
  ChevronDown,
  ChevronRight,
  Shield,
  Map,
  Brain,
  Download,
  Snowflake,
  Sun,
  Eye,
  MessageSquare,
  History,
  UserPlus,
  UserMinus,
  Key,
  Shield as ShieldIcon,
  Lock,
  Settings,
  LogOut
} from 'lucide-react';

const SidebarNavigation = () => {
  const [expandedMenus, setExpandedMenus] = useState({});
  const [activeItem, setActiveItem] = useState('dashboard');

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const handleMenuClick = (itemKey) => {
    setActiveItem(itemKey);
    // Add navigation logic here
    console.log(`Navigating to: ${itemKey}`);
    
    // Emit custom event for parent component to handle routing
    window.dispatchEvent(new CustomEvent('navigateToSection', { 
      detail: { section: itemKey } 
    }));
  };

  const handleLogout = () => {
    // Clear user session data
    localStorage.removeItem('userInfo');
    localStorage.removeItem('authToken');
    
    // Redirect to home page
    window.location.href = '/';
  };

  const menuItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      subItems: []
    },
    {
      key: 'case-manager',
      label: 'Case Manager',
      icon: FolderOpen,
      subItems: []
    },
    {
      key: 'escalations',
      label: 'Escalations',
      icon: AlertTriangle,
      subItems: []
    },
    {
      key: 'evidence-library',
      label: 'Evidence Library',
      icon: FileText,
      subItems: []
    },
    {
      key: 'contact-police',
      label: 'Contact Police',
      icon: Phone,
      subItems: []
    },
    {
      key: 'system-logs',
      label: 'System Logs',
      icon: History,
      subItems: []
    },
    {
      key: 'rl-dashboard',
      label: 'RL Engine',
      icon: Brain,
      subItems: []
    },
    {
      key: 'user-management',
      label: 'User Management',
      icon: Users,
      isExpandable: true,
      subItems: [
        { key: 'add-remove-investigators', label: 'Add / Remove Investigators', icon: UserPlus },
        { key: 'reset-passwords', label: 'Reset Passwords', icon: Key },
        { key: 'setup-2fa', label: 'Setup 2FA', icon: Lock }
      ]
    }
  ];

  return (
    <div className="w-64 h-screen bg-gray-900 text-gray-100 flex flex-col border-r border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Cybercrime Dashboard</h1>
            <p className="text-xs text-gray-400">v0.2</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <div key={item.key} className="space-y-1">
            {/* Main Menu Item */}
            <button
              onClick={() => {
                if (item.isExpandable) {
                  toggleMenu(item.key);
                } else {
                  handleMenuClick(item.key);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                activeItem === item.key
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'hover:bg-gray-800 text-gray-300 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.isExpandable && (
                <div className="transition-transform duration-200">
                  {expandedMenus[item.key] ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
              )}
            </button>

            {/* Sub Items */}
            {item.subItems && (
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  expandedMenus[item.key] || !item.isExpandable
                    ? 'max-h-96 opacity-100'
                    : 'max-h-0 opacity-0'
                }`}
              >
                <div className="ml-4 space-y-1 border-l border-gray-700 pl-4">
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.key}
                      onClick={() => handleMenuClick(subItem.key)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-all duration-200 text-sm ${
                        activeItem === subItem.key
                          ? 'bg-red-500/20 text-red-300 border-l-2 border-red-500'
                          : subItem.isSubSubItem
                          ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 ml-4'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                      }`}
                    >
                      <subItem.icon className="w-4 h-4" />
                      <span>{subItem.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-700 bg-gray-800">
        <div className="text-center mb-4">
          <p className="text-sm font-semibold text-white">Admin Control Panel v0.2</p>
          <p className="text-xs text-gray-400 mt-1">Secure Access</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default SidebarNavigation;
