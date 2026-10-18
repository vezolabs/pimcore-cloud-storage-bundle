<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Command;

use Pimcore\Console\AbstractCommand;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Vezolabs\CloudStorageBundle\Repository\StorageConfigurationRepository;
use Vezolabs\CloudStorageBundle\Service\ConnectionTester;
use Vezolabs\CloudStorageBundle\Service\StorageManagerService;

#[AsCommand(
    name: 'pimcore:cloud-storage:test',
    description: 'Performs live connection and permission probe test on a cloud storage configuration'
)]
class CloudStorageTestCommand extends AbstractCommand
{
    public function __construct(
        private readonly ConnectionTester $connectionTester,
        private readonly StorageConfigurationRepository $repository,
        private readonly StorageManagerService $storageManager
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument('name', InputArgument::OPTIONAL, 'Name or ID of configuration to test (defaults to active configuration)');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $nameOrId = $input->getArgument('name');

        if ($nameOrId) {
            $config = is_numeric($nameOrId)
                ? $this->repository->findById((int)$nameOrId)
                : $this->repository->findByName($nameOrId);
        } else {
            $config = $this->storageManager->getActiveConfiguration();
        }

        if ($config === null) {
            $io->error('No matching storage configuration found to test.');

            return 1;
        }

        $io->title(sprintf("Testing Connection for '%s' (%s)", $config->getDisplayName(), strtoupper($config->getProvider())));
        $io->writeln("Running probe test (bucket access, write canary, read verification, delete cleanup)...");

        $result = $this->connectionTester->testById($config->getId(), 'cli');

        if ($result['success']) {
            $io->success($result['message']);
            $io->writeln(sprintf('Total round-trip latency: <info>%.2f ms</info>', $result['latency_ms']));

            if (!empty($result['details'])) {
                $rows = [];
                foreach ($result['details'] as $stepKey => $step) {
                    $rows[] = [$stepKey, strtoupper($step['status'] ?? 'OK'), $step['description'] ?? '', ($step['duration_ms'] ?? 0) . ' ms'];
                }
                $io->table(['Operation', 'Status', 'Description', 'Latency'], $rows);
            }

            return 0;
        }

        $io->error($result['message']);
        if (!empty($result['details'])) {
            $io->dump($result['details']);
        }

        return 1;
    }
}
