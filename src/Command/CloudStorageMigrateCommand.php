<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Command;

use Pimcore\Console\AbstractCommand;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Helper\ProgressBar;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Vezolabs\CloudStorageBundle\Entity\MigrationJob;
use Vezolabs\CloudStorageBundle\Entity\StorageConfiguration;
use Vezolabs\CloudStorageBundle\Repository\MigrationJobRepository;
use Vezolabs\CloudStorageBundle\Repository\StorageConfigurationRepository;
use Vezolabs\CloudStorageBundle\Service\MigrationOrchestrator;
use Vezolabs\CloudStorageBundle\Service\StorageManagerService;

#[AsCommand(
    name: 'pimcore:cloud-storage:migrate',
    description: 'Safely copies asset binaries between storage providers with progress and verification'
)]
class CloudStorageMigrateCommand extends AbstractCommand
{
    public function __construct(
        private readonly MigrationOrchestrator $orchestrator,
        private readonly StorageConfigurationRepository $configRepository,
        private readonly MigrationJobRepository $jobRepository,
        private readonly StorageManagerService $storageManager
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('target', 't', InputOption::VALUE_REQUIRED, 'Target storage configuration name or ID')
            ->addOption('source', 's', InputOption::VALUE_OPTIONAL, 'Source storage configuration name or ID (defaults to currently active)')
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Simulate migration without writing to destination');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $targetOption = $input->getOption('target');
        $sourceOption = $input->getOption('source');
        $isDryRun = (bool)$input->getOption('dry-run');

        if (!$targetOption) {
            $io->error('--target option is required.');

            return 1;
        }

        $target = is_numeric($targetOption)
            ? $this->configRepository->findById((int)$targetOption)
            : $this->configRepository->findByName($targetOption);

        if ($target === null) {
            $io->error("Target configuration '{$targetOption}' not found.");

            return 1;
        }

        $source = null;
        if ($sourceOption) {
            $source = is_numeric($sourceOption)
                ? $this->configRepository->findById((int)$sourceOption)
                : $this->configRepository->findByName($sourceOption);
        } else {
            $source = $this->storageManager->getActiveConfiguration();
        }

        if ($source === null) {
            $source = (new StorageConfiguration())
                ->setName('local')
                ->setDisplayName('Local Storage (/public/var/assets)')
                ->setProvider(StorageConfiguration::PROVIDER_LOCAL);
        }

        $io->title(sprintf(
            "Pimcore Asset Migration: %s -> %s %s",
            $source->getDisplayName(),
            $target->getDisplayName(),
            $isDryRun ? '[DRY RUN]' : ''
        ));

        $io->writeln('Performing preflight scan...');
        $preflight = $this->orchestrator->preflightScan($source, $target);

        $io->definitionList(
            ['Total Files to Migrate' => $preflight['total_files']],
            ['Total Data Size' => $preflight['formatted_size']],
            ['Target Storage Reachable' => $preflight['target_accessible'] ? 'YES' : 'NO'],
            ['Estimated Duration' => sprintf('~%d seconds', $preflight['estimated_duration_seconds'])]
        );

        if (!$preflight['target_accessible']) {
            $io->error('Target storage is not accessible. Please verify credentials and network access.');

            return 1;
        }

        if ($preflight['total_files'] === 0) {
            $io->warning('Source storage contains 0 files. Nothing to migrate.');

            return 0;
        }

        if (!$isDryRun) {
            $confirm = $io->confirm('Do you want to proceed with copying files now?', true);
            if (!$confirm) {
                $io->warning('Migration aborted.');

                return 0;
            }
        }

        $job = new MigrationJob();
        $job->setSourceConfigId($source->getId());
        $job->setTargetConfigId($target->getId());
        $job->setSourceName($source->getName());
        $job->setTargetName($target->getName());
        $job->setIsDryRun($isDryRun);
        $job->setTotalFiles($preflight['total_files']);
        $job->setTotalBytes($preflight['total_bytes']);
        $job->setInitiatedBy('cli');

        $this->jobRepository->save($job);

        $progressBar = new ProgressBar($output, $preflight['total_files']);
        $progressBar->setFormat('%current%/%max% [%bar%] %percent:3s%% - %message%');
        $progressBar->start();

        $this->orchestrator->runMigration($job, function (MigrationJob $j) use ($progressBar) {
            $progressBar->setProgress($j->getProcessedFiles());
            $progressBar->setMessage(substr((string)$j->getCurrentFile(), -40));
        });

        $progressBar->finish();
        $io->newLine(2);

        if ($job->getFailedFiles() > 0) {
            $io->warning(sprintf('Migration completed with %d failed files out of %d.', $job->getFailedFiles(), $job->getTotalFiles()));
            $io->dump($job->getErrorLog());
        } else {
            $io->success(sprintf('Migration completed successfully! %d files migrated.', $job->getProcessedFiles()));
        }

        return $job->getFailedFiles() > 0 ? 1 : 0;
    }
}
