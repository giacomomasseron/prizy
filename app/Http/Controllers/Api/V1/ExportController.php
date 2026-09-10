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

        return response()->download($export['path'], $export['filename'], [
            'Content-Type' => 'application/zip',
        ])->deleteFileAfterSend(true);
    }
}
