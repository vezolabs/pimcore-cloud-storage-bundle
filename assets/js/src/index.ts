import { CloudStoragePage } from './pages/CloudStoragePage';

function resolveService(container: any, ids: string[]) {
  if (!container) return null;
  for (const id of ids) {
    try {
      if (typeof container.isBound === 'function' && container.isBound(id)) {
        return container.get(id);
      }
    } catch (_) {}
    try {
      const svc = container.get(id);
      if (svc) return svc;
    } catch (_) {}
  }
  return null;
}

let isRegistered = false;

function registerCloudStorage(container: any) {
  if (isRegistered || !container) return;
  isRegistered = true;

  try {
    // 1. Register Widget in Studio Widget Registry
    const widgetRegistry = resolveService(container, [
      'WidgetManagerService',
      'widgetManager',
      'App/WidgetManager/WidgetRegistry',
      'widgetRegistry',
    ]);

    if (widgetRegistry && typeof widgetRegistry.registerWidget === 'function') {
      widgetRegistry.registerWidget({
        name: 'cloud-storage',
        component: CloudStoragePage,
      });
    }

    // 2. Register Navigation Entry in Studio Main Nav Registry
    const mainNavRegistry = resolveService(container, [
      'MainNavRegistry',
      'mainNavRegistry',
      'App/MainNavRegistry/MainNavRegistry',
    ]);

    if (mainNavRegistry && typeof mainNavRegistry.registerMainNavItem === 'function') {
      // Primary: Parallel to System at top level
      mainNavRegistry.registerMainNavItem({
        path: 'Cloud Storage',
        label: 'Cloud Storage',
        order: 830,
        icon: 'cloud',
        widgetConfig: {
          name: 'cloud-storage',
          id: 'cloud-storage',
          component: 'cloud-storage',
          config: {
            title: 'Vezo Labs : Cloud Storage',
            label: 'Vezo Labs : Cloud Storage',
            icon: {
              type: 'name',
              value: 'cloud',
            },
          },
        },
      });

      // Secondary: Under System menu
      mainNavRegistry.registerMainNavItem({
        path: 'System/Cloud Storage',
        label: 'Cloud Storage',
        order: 1080,
        icon: 'cloud',
        widgetConfig: {
          name: 'cloud-storage',
          id: 'cloud-storage',
          component: 'cloud-storage',
          config: {
            title: 'Vezo Labs : Cloud Storage',
            label: 'Vezo Labs : Cloud Storage',
            icon: {
              type: 'name',
              value: 'cloud',
            },
          },
        },
      });

      // Secondary: Under AssetManagement
      mainNavRegistry.registerMainNavItem({
        path: 'AssetManagement/Cloud Storage',
        label: 'Cloud Storage',
        order: 1050,
        icon: 'cloud',
        widgetConfig: {
          name: 'cloud-storage',
          id: 'cloud-storage',
          component: 'cloud-storage',
          config: {
            title: 'Vezo Labs : Cloud Storage',
            label: 'Vezo Labs : Cloud Storage',
            icon: {
              type: 'name',
              value: 'cloud',
            },
          },
        },
      });
    }
  } catch (e) {
    console.error('[Cloud Storage] Error registering Studio UI components:', e);
  }
}

export const VezolabsCloudStoragePlugin = {
  name: 'VezolabsCloudStorageBundle',
  priority: 15,

  onInit: ({ container }: { container: any }) => {
    registerCloudStorage(container);
  },

  onStartup: ({ container }: { container?: any } = {}) => {
    if (container) {
      registerCloudStorage(container);
    }
  },
};

export default VezolabsCloudStoragePlugin;
