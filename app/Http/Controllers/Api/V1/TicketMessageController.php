<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\PostTicketMessageRequest;
use App\Http\Resources\TicketMessageResource;
use App\UseCases\Tickets\PostTicketMessage;
use Illuminate\Http\JsonResponse;

final class TicketMessageController extends Controller
{
    public function store(PostTicketMessageRequest $request, string $ticket): JsonResponse
    {
        $message = PostTicketMessage::run(
            $request->user(),
            $ticket,
            (string) $request->validated('body'),
            $request->boolean('internal'),
        );

        return (new TicketMessageResource($message))->response()->setStatusCode(201);
    }
}
