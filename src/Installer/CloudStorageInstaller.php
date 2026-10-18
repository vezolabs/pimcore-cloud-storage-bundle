<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Installer;

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Schema\Schema;
use Pimcore\Extension\Bundle\Installer\AbstractInstaller;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;
use Vezolabs\CloudStorageBundle\Repository\ConfigAuditLogRepository;
use Vezolabs\CloudStorageBundle\Repository\MigrationJobRepository;
use Vezolabs\CloudStorageBundle\Repository\StorageConfigurationRepository;
use Vezolabs\CloudStorageBundle\VezolabsCloudStorageBundle;

class CloudStorageInstaller extends AbstractInstaller
{
    public function __construct(
        private readonly Connection $connection,
        private readonly StorageConfigurationRepository $configurationRepository
    ) {
        parent::__construct();
    }

    public function install(): void
    {
        $schemaManager = $this->connection->createSchemaManager();
        $schemaConfig = $schemaManager->createSchemaConfig();

        // 1. Configurations table
        if (!$schemaManager->tablesExist([StorageConfigurationRepository::TABLE_NAME])) {
            $schema = new Schema([], [], $schemaConfig);
            $table = $schema->createTable(StorageConfigurationRepository::TABLE_NAME);
            $table->addColumn('id', 'integer', ['autoincrement' => true]);
            $table->addColumn('name', 'string', ['length' => 100]);
            $table->addColumn('display_name', 'string', ['length' => 190]);
            $table->addColumn('provider', 'string', ['length' => 50, 'default' => 's3']);
            $table->addColumn('is_active', 'boolean', ['default' => false]);
            $table->addColumn('bucket_or_container', 'string', ['length' => 190, 'default' => '']);
            $table->addColumn('region_or_project', 'string', ['length' => 100, 'notnull' => false]);
            $table->addColumn('endpoint', 'string', ['length' => 255, 'notnull' => false]);
            $table->addColumn('path_prefix', 'string', ['length' => 255, 'notnull' => false]);
            $table->addColumn('auth_type', 'string', ['length' => 50, 'default' => 'access_keys']);
            $table->addColumn('credentials_encrypted', 'text', ['notnull' => false]);
            $table->addColumn('settings', 'text', ['notnull' => false]);
            $table->addColumn('last_tested_at', 'datetime', ['notnull' => false]);
            $table->addColumn('last_test_status', 'string', ['length' => 50, 'notnull' => false]);
            $table->addColumn('last_test_message', 'text', ['notnull' => false]);
            $table->addColumn('created_at', 'datetime');
            $table->addColumn('updated_at', 'datetime');
            $table->addColumn('created_by', 'string', ['length' => 190, 'notnull' => false]);
            $table->addColumn('updated_by', 'string', ['length' => 190, 'notnull' => false]);

            $table->setPrimaryKey(['id']);
            $table->addUniqueIndex(['name'], 'uniq_cloud_config_name');
            $table->addIndex(['is_active'], 'idx_cloud_config_active');

            foreach ($schema->toSql($this->connection->getDatabasePlatform()) as $sql) {
                $this->connection->executeStatement($sql);
            }
        }

        // 2. History / Audit Log table
        if (!$schemaManager->tablesExist([ConfigAuditLogRepository::TABLE_NAME])) {
            $schema = new Schema([], [], $schemaConfig);
            $table = $schema->createTable(ConfigAuditLogRepository::TABLE_NAME);
            $table->addColumn('id', 'integer', ['autoincrement' => true]);
            $table->addColumn('config_id', 'integer', ['notnull' => false]);
            $table->addColumn('config_name', 'string', ['length' => 190]);
            $table->addColumn('action', 'string', ['length' => 50]);
            $table->addColumn('changed_by', 'string', ['length' => 190]);
            $table->addColumn('snapshot', 'text', ['notnull' => false, 'length' => 16777215]); // MediumText
            $table->addColumn('note', 'text', ['notnull' => false]);
            $table->addColumn('created_at', 'datetime');

            $table->setPrimaryKey(['id']);
            $table->addIndex(['config_id'], 'idx_cloud_hist_config_id');
            $table->addIndex(['created_at'], 'idx_cloud_hist_created');

            foreach ($schema->toSql($this->connection->getDatabasePlatform()) as $sql) {
                $this->connection->executeStatement($sql);
            }
        }

        // 3. Migration jobs table
        if (!$schemaManager->tablesExist([MigrationJobRepository::TABLE_NAME])) {
            $schema = new Schema([], [], $schemaConfig);
            $table = $schema->createTable(MigrationJobRepository::TABLE_NAME);
            $table->addColumn('id', 'integer', ['autoincrement' => true]);
            $table->addColumn('source_config_id', 'integer', ['notnull' => false]);
            $table->addColumn('target_config_id', 'integer');
            $table->addColumn('source_name', 'string', ['length' => 100]);
            $table->addColumn('target_name', 'string', ['length' => 100]);
            $table->addColumn('status', 'string', ['length' => 50, 'default' => 'pending']);
            $table->addColumn('total_files', 'integer', ['default' => 0]);
            $table->addColumn('total_bytes', 'bigint', ['default' => 0]);
            $table->addColumn('processed_files', 'integer', ['default' => 0]);
            $table->addColumn('processed_bytes', 'bigint', ['default' => 0]);
            $table->addColumn('failed_files', 'integer', ['default' => 0]);
            $table->addColumn('current_file', 'string', ['length' => 255, 'notnull' => false]);
            $table->addColumn('error_log', 'text', ['notnull' => false]);
            $table->addColumn('is_dry_run', 'boolean', ['default' => false]);
            $table->addColumn('created_at', 'datetime');
            $table->addColumn('started_at', 'datetime', ['notnull' => false]);
            $table->addColumn('finished_at', 'datetime', ['notnull' => false]);
            $table->addColumn('initiated_by', 'string', ['length' => 190, 'notnull' => false]);

            $table->setPrimaryKey(['id']);
            $table->addIndex(['status'], 'idx_cloud_mig_status');

            foreach ($schema->toSql($this->connection->getDatabasePlatform()) as $sql) {
                $this->connection->executeStatement($sql);
            }
        }

        // 4. Register Studio permissions
        $this->registerPermissions();

        // 5. Seed default Local configuration if empty
        if ($this->configurationRepository->countAll() === 0) {
            $local = new StorageConfiguration();
            $local->setName('local-default');
            $local->setDisplayName('Local Application Filesystem');
            $local->setProvider(StorageConfiguration::PROVIDER_LOCAL);
            $local->setIsActive(true);
            $local->setBucketOrContainer('public/var/assets');
            $local->setAuthType('local');
            $local->setLastTestStatus(StorageConfiguration::TEST_STATUS_SUCCESS);
            $local->setLastTestMessage('Local disk access active.');
            $local->setLastTestedAt(new \DateTime());

            $this->configurationRepository->save($local, 'installer');
        }
    }

    public function uninstall(): void
    {
        $schemaManager = $this->connection->createSchemaManager();
        $tables = [
            MigrationJobRepository::TABLE_NAME,
            ConfigAuditLogRepository::TABLE_NAME,
            StorageConfigurationRepository::TABLE_NAME,
        ];

        foreach ($tables as $table) {
            if ($schemaManager->tablesExist([$table])) {
                $this->connection->executeStatement('DROP TABLE ' . $table);
            }
        }

        // Remove permissions
        $this->connection->executeStatement(
            'DELETE FROM users_permission_definitions WHERE `key` IN (?, ?)',
            [VezolabsCloudStorageBundle::PERMISSION_VIEW, VezolabsCloudStorageBundle::PERMISSION_MANAGE]
        );
    }

    public function isInstalled(): bool
    {
        $schemaManager = $this->connection->createSchemaManager();

        return $schemaManager->tablesExist([StorageConfigurationRepository::TABLE_NAME]);
    }

    public function canBeInstalled(): bool
    {
        return !$this->isInstalled();
    }

    public function canBeUninstalled(): bool
    {
        return $this->isInstalled();
    }

    private function registerPermissions(): void
    {
        $permissions = [
            ['key' => VezolabsCloudStorageBundle::PERMISSION_VIEW, 'category' => 'settings'],
            ['key' => VezolabsCloudStorageBundle::PERMISSION_MANAGE, 'category' => 'settings'],
        ];

        foreach ($permissions as $perm) {
            $exists = (int)$this->connection->fetchOne(
                'SELECT COUNT(*) FROM users_permission_definitions WHERE `key` = ?',
                [$perm['key']]
            );
            if ($exists === 0) {
                $this->connection->executeStatement(
                    'INSERT INTO users_permission_definitions (`key`, `category`) VALUES (?, ?)',
                    [$perm['key'], $perm['category']]
                );
            }
        }
    }
}
