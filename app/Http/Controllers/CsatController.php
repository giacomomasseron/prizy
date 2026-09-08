<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\UseCases\Tickets\RecordCsatResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class CsatController extends Controller
{
    public function __construct(private readonly RecordCsatResponse $recordCsatResponse) {}

    public function respond(Request $request, string $ticket, string $rating): Response
    {
        // Manual signature check instead of the 'signed' middleware so
        // customers get a friendly branded page, not the default 403.
        if (! $request->hasValidSignature()) {
            return response()->view('csat.expired', [], 403);
        }

        $model = $this->recordCsatResponse->handle($ticket, $rating);

        return response()->view('csat.thanks', [
            'rating' => $model->csat_rating,
            'subject' => $model->subject,
        ]);
    }
}
