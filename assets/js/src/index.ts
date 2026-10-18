import { CloudStoragePage } from './pages/CloudStoragePage';

export const VezolabsCloudStoragePlugin = {
  name: 'VezolabsCloudStorageBundle',
  priority: 15,

  onInit: ({ container }: { container: any }) => {
    try {
      // 1. Register Main Settings Widget
      const widgetRegistry = container.get('widgetRegistry') || container.get('App/WidgetManager/WidgetRegistry');
      if (widgetRegistry?.registerWidget) {
        widgetRegistry.registerWidget({
          name: 'cloud-storage',
          component: CloudStoragePage,
        });
      }

      // 2. Register Navigation Entry: Settings -> Cloud Storage
      const mainNavRegistry = container.get('mainNavRegistry') || container.get('App/MainNavRegistry/MainNavRegistry');
      if (mainNavRegistry?.registerMainNavItem) {
        mainNavRegistry.registerMainNavItem({
          path: 'Settings/Cloud Storage',
          label: 'Cloud Storage',
          order: 1060,
          permission: 'PIMCORE_CLOUD_STORAGE_VIEW',
          widgetConfig: {
            name: 'cloud-storage',
            id: 'cloud-storage',
            component: 'cloud-storage',
            config: {
              translationKey: 'Cloud Storage',
              icon: {
                type: 'name',
                value: 'cloud',
              },
            },
          },
        });
      }
    } catch (e) {
      console.error('[Cloud Storage] Plugin registration error:', e);
    }
  },

  onStartup: () => {
    console.log('[Cloud Storage] Plugin initialized successfully.');
  },
};
