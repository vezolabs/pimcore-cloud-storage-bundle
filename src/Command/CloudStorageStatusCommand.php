<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Command;

use Pimcore\Console\AbstractCommand;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Vezolabs\CloudStorageBundle\Repository\StorageConfigurationRepository;
use Vezolabs\CloudStorageBundle\Service\DiagnosticsService;
use Vezolabs\CloudStorageBundle\Service\StorageManagerService;

#[AsCommand(
    name: 'pimcore:cloud-storage:status',
    description: 'Displays active cloud storage provider, health, and configuration status'
)]
class CloudStorageStatusCommand extends AbstractCommand
{
    public function __construct(
        private readonly StorageManagerService $storageManager,
        private readonly StorageConfigurationRepository $repository,
        private readonly DiagnosticsService $diagnosticsService
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Pimcore Cloud Storage Manager - Status');

        $active = $this->storageManager->getActiveConfiguration();
        $total = $this->repository->countAll();
        $diag = $this->diagnosticsService->getDiagnostics();

        $io->section('Active Storage Backend');
        if ($active) {
            $io->definitionList(
                ['Configuration Name' => $active->getName()],
                ['Display Name' => $active->getDisplayName()],
                ['Provider' => strtoupper($active->getProvider())],
                ['Bucket / Container' => $active->getBucketOrContainer()],
                ['Region / Project' => $active->getRegionOrProject() ?? 'N/A'],
                ['Endpoint' => $active->getEndpoint() ?? 'Default'],
                ['Path Prefix' => $active->getPathPrefix() ?? 'Root'],
                ['Last Test Status' => $active->getLastTestStatus() ?? 'Not Tested'],
                ['Last Test Message' => $active->getLastTestMessage() ?? 'N/A']
            );
        } else {
            $io->warning('No active cloud storage configured. Using local fallback.');
        }

        $io->section('System Diagnostics');
        $io->writeln('Status: ' . strtoupper($diag['status']));
        $rows = [];
        foreach ($diag['checks'] as $key => $check) {
            $rows[] = [$check['name'], strtoupper($check['status']), $check['value'], $check['message']];
        }
        $io->table(['Check', 'Status', 'Value', 'Message'], $rows);

        $io->writeln(sprintf('Total configured storage providers: <info>%d</info>', $total));

        return 0;
    }
}
