<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Entity;

use DateTime;
use DateTimeInterface;

class ConfigAuditLog
{
    public const string ACTION_CREATE = 'CREATE';
    public const string ACTION_UPDATE = 'UPDATE';
    public const string ACTION_ACTIVATE = 'ACTIVATE';
    public const string ACTION_ROLLBACK = 'ROLLBACK';
    public const string ACTION_DELETE = 'DELETE';
    public const string ACTION_TEST = 'TEST';

    private ?int $id = null;
    private ?int $configId = null;
    private string $configName = '';
    private string $action = self::ACTION_CREATE;
    private string $changedBy = 'system';
    private array $configurationSnapshot = [];
    private ?string $note = null;
    private DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function setId(?int $id): self
    {
        $this->id = $id;

        return $this;
    }

    public function getConfigId(): ?int
    {
        return $this->configId;
    }

    public function setConfigId(?int $configId): self
    {
        $this->configId = $configId;

        return $this;
    }

    public function getConfigName(): string
    {
        return $this->configName;
    }

    public function setConfigName(string $configName): self
    {
        $this->configName = $configName;

        return $this;
    }

    public function getAction(): string
    {
        return $this->action;
    }

    public function setAction(string $action): self
    {
        $this->action = $action;

        return $this;
    }

    public function getChangedBy(): string
    {
        return $this->changedBy;
    }

    public function setChangedBy(string $changedBy): self
    {
        $this->changedBy = $changedBy;

        return $this;
    }

    public function getConfigurationSnapshot(): array
    {
        return $this->configurationSnapshot;
    }

    public function setConfigurationSnapshot(array $configurationSnapshot): self
    {
        $this->configurationSnapshot = $configurationSnapshot;

        return $this;
    }

    public function getNote(): ?string
    {
        return $this->note;
    }

    public function setNote(?string $note): self
    {
        $this->note = $note;

        return $this;
    }

    public function getCreatedAt(): DateTimeInterface
    {
        return $this->createdAt;
    }

    public function setCreatedAt(DateTimeInterface $createdAt): self
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'config_id' => $this->configId,
            'config_name' => $this->configName,
            'action' => $this->action,
            'changed_by' => $this->changedBy,
            'configuration_snapshot' => $this->configurationSnapshot,
            'note' => $this->note,
            'created_at' => $this->createdAt->format(DateTimeInterface::ATOM),
        ];
    }
}
