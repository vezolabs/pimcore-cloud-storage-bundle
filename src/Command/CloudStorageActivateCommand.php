<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Command;

use Pimcore\Console\AbstractCommand;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Vezolabs\CloudStorageBundle\Repository\StorageConfigurationRepository;
use Vezolabs\CloudStorageBundle\Service\StorageManagerService;

#[AsCommand(
    name: 'pimcore:cloud-storage:activate',
    description: 'Activates a cloud storage configuration for asset operations'
)]
class CloudStorageActivateCommand extends AbstractCommand
{
    public function __construct(
        private readonly StorageManagerService $storageManager,
        private readonly StorageConfigurationRepository $repository
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('name', InputArgument::REQUIRED, 'Name or ID of configuration to activate')
            ->addOption('force', 'f', InputOption::VALUE_NONE, 'Skip confirmation prompt');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $nameOrId = $input->getArgument('name');
        $force = $input->getOption('force');

        $config = is_numeric($nameOrId)
            ? $this->repository->findById((int)$nameOrId)
            : $this->repository->findByName($nameOrId);

        if ($config === null) {
            $io->error("Configuration '{$nameOrId}' not found.");

            return 1;
        }

        if ($config->isActive()) {
            $io->note("Configuration '{$config->getDisplayName()}' is already the active storage backend.");

            return 0;
        }

        if (!$force) {
            $confirm = $io->confirm(
                sprintf("Are you sure you want to activate '%s' (%s)? New asset operations will target this storage.", $config->getDisplayName(), strtoupper($config->getProvider())),
                false
            );

            if (!$confirm) {
                $io->warning('Activation aborted.');

                return 0;
            }
        }

        $active = $this->storageManager->activate($config->getId(), 'cli');
        $io->success(sprintf("Successfully activated '%s' (%s) as the primary asset storage backend.", $active->getDisplayName(), strtoupper($active->getProvider())));

        return 0;
    }
}
