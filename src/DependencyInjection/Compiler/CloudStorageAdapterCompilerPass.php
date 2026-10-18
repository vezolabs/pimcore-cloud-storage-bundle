<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\DependencyInjection\Compiler;

use Symfony\Component\DependencyInjection\Compiler\CompilerPassInterface;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Definition;
use Symfony\Component\DependencyInjection\Reference;
use Vezolabs\CloudStorageBundle\Flysystem\CloudStorageAdapterFactory;
use Vezolabs\CloudStorageBundle\Flysystem\DynamicCloudStorageAdapter;
use Vezolabs\CloudStorageBundle\Service\StorageManagerService;

class CloudStorageAdapterCompilerPass implements CompilerPassInterface
{
    public function process(ContainerBuilder $container): void
    {
        // 1. Hook into Pimcore Asset Storage Queue Adapter
        if ($container->hasDefinition('pimcore.asset.storage_queue.adapter.asset')) {
            $queueDef = $container->getDefinition('pimcore.asset.storage_queue.adapter.asset');

            $dynamicAssetAdapterDef = new Definition(DynamicCloudStorageAdapter::class, [
                new Reference('pimcore.asset.storage_queue.adapter.asset.inner'),
                new Reference(StorageManagerService::class),
                new Reference(CloudStorageAdapterFactory::class),
                new Reference('logger'),
                'asset',
            ]);
            $dynamicAssetAdapterDef->setPublic(true);

            $container->setDefinition('vezolabs.cloud_storage.dynamic_adapter.asset', $dynamicAssetAdapterDef);
            $queueDef->setArgument(0, new Reference('vezolabs.cloud_storage.dynamic_adapter.asset'));
        }

        // 2. Hook into Pimcore Thumbnail Storage Queue Adapter
        if ($container->hasDefinition('pimcore.asset.storage_queue.adapter.thumbnail')) {
            $thumbQueueDef = $container->getDefinition('pimcore.asset.storage_queue.adapter.thumbnail');

            $dynamicThumbAdapterDef = new Definition(DynamicCloudStorageAdapter::class, [
                new Reference('pimcore.asset.storage_queue.adapter.thumbnail.inner'),
                new Reference(StorageManagerService::class),
                new Reference(CloudStorageAdapterFactory::class),
                new Reference('logger'),
                'thumbnail',
            ]);
            $dynamicThumbAdapterDef->setPublic(true);

            $container->setDefinition('vezolabs.cloud_storage.dynamic_adapter.thumbnail', $dynamicThumbAdapterDef);
            $thumbQueueDef->setArgument(0, new Reference('vezolabs.cloud_storage.dynamic_adapter.thumbnail'));
        }

        // 3. Register reset listeners on StorageManagerService
        if ($container->hasDefinition(StorageManagerService::class)) {
            $storageManagerDef = $container->getDefinition(StorageManagerService::class);
            if ($container->hasDefinition('vezolabs.cloud_storage.dynamic_adapter.asset')) {
                $storageManagerDef->addMethodCall('addResetListener', [
                    [new Reference('vezolabs.cloud_storage.dynamic_adapter.asset'), 'resetAdapterCache'],
                ]);
            }
            if ($container->hasDefinition('vezolabs.cloud_storage.dynamic_adapter.thumbnail')) {
                $storageManagerDef->addMethodCall('addResetListener', [
                    [new Reference('vezolabs.cloud_storage.dynamic_adapter.thumbnail'), 'resetAdapterCache'],
                ]);
            }
        }
    }
}
