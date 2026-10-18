<?php

declare(strict_types=1);

namespace Vezolabs\CloudStorageBundle\Controller;

use Pimcore\Model\Asset;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Attribute\Route;

class AssetStreamController extends AbstractController
{
    #[Route('/cloud-asset{uri}', name: 'vezolabs_cloud_storage_asset_stream', requirements: ['uri' => '.+'], methods: ['GET', 'HEAD'])]
    public function streamAsset(string $uri): Response
    {
        $asset = Asset::getByPath($uri);
        if (!$asset instanceof Asset || $asset->getType() === 'folder') {
            return new Response('Asset not found', Response::HTTP_NOT_FOUND);
        }

        $stream = $asset->getStream();
        if (!\is_resource($stream) || $asset->isStreamPlaceholder()) {
            return new Response('Unable to read asset from cloud storage', Response::HTTP_NOT_FOUND);
        }

        $mimeType = $asset->getMimeType() ?: 'application/octet-stream';
        $fileSize = $asset->getFileSize();

        $headers = [
            'Content-Type' => $mimeType,
            'Content-Disposition' => sprintf('inline; filename="%s"', addslashes($asset->getFilename())),
            'Cache-Control' => 'public, max-age=86400, stale-while-revalidate=604800',
        ];

        if ($fileSize > 0) {
            $headers['Content-Length'] = (string)$fileSize;
        }

        return new StreamedResponse(
            function () use ($stream) {
                fpassthru($stream);
                if (\is_resource($stream)) {
                    fclose($stream);
                }
            },
            Response::HTTP_OK,
            $headers
        );
    }
}
