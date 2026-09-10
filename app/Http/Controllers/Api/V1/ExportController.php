<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\UseCases\Workspace\ExportWorkspace;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

final class ExportController extends Controller
{
    public function __construct(private readonly ExportWorkspace $exportWorkspace) {}

    public function download(Request $request): BinaryFileResponse
    {
        $export = $this->exportWorkspace->handle($request->user());

        $response = response()->download($export['path'], $export['filename'], [
            'Content-Type' => 'application/zip',
        ])->deleteFileAfterSend(true);

        // Must be set AFTER construction: response()->download()'s factory calls
        // setPublic() internally, which would override an array Cache-Control
        // header passed alongside the other headers above.
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }
}
