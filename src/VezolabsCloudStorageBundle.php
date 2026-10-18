<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle;

use Pimcore\Extension\Bundle\AbstractPimcoreBundle;
use Pimcore\Extension\Bundle\Installer\InstallerInterface;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Vezolabs\CloudStorageBundle\DependencyInjection\Compiler\CloudStorageAdapterCompilerPass;
use Vezolabs\CloudStorageBundle\Installer\CloudStorageInstaller;

final class VezolabsCloudStorageBundle extends AbstractPimcoreBundle
{
    public const string BUNDLE_NAME = 'VezolabsCloudStorageBundle';
    public const string PERMISSION_VIEW = 'PIMCORE_CLOUD_STORAGE_VIEW';
    public const string PERMISSION_MANAGE = 'PIMCORE_CLOUD_STORAGE_MANAGE';

    public function build(ContainerBuilder $container): void
    {
        parent::build($container);
        $container->addCompilerPass(new CloudStorageAdapterCompilerPass());
    }

    public function getNiceName(): string
    {
        return 'Cloud Storage Manager';
    }

    public function getDescription(): string
    {
        return 'Configure and manage Amazon S3, Azure Blob, and Google Cloud Storage directly from Pimcore 12 Studio';
    }

    public function getVersion(): string
    {
        return '1.0.0';
    }

    public function getInstaller(): ?InstallerInterface
    {
        return $this->container?->get(CloudStorageInstaller::class);
    }

    public function getPath(): string
    {
        return \dirname(__DIR__);
    }
}
