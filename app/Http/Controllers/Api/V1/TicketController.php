<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\TicketMessageResource;
use App\Http\Resources\TicketResource;
use App\UseCases\Tickets\FindTicket;
use App\UseCases\Tickets\ListTickets;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class TicketController extends Controller
{
    public function __construct(
        private readonly ListTickets $listTickets,
        private readonly FindTicket $findTicket,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tickets = $this->listTickets->handle($request->user());

        return TicketResource::collection($tickets)->response();
    }

    public function show(Request $request, string $ticket): JsonResponse
    {
        $model = $this->findTicket->handle($request->user(), $ticket);

        $history = $model->requester
            ? $model->requester->tickets()->where('id', '!=', $model->id)->orderByDesc('updated_at')->limit(6)
                ->get(['id', 'subject', 'status'])
                ->map(fn ($t) => ['id' => $t->id, 'subject' => $t->subject, 'status' => $t->status])->values()
            : collect();

        return response()->json([
            'data' => array_merge(
                (new TicketResource($model))->toArray($request),
                [
                    'messages' => TicketMessageResource::collection($model->ticketMessages)->toArray($request),
                    'requester_history' => $history,
                ],
            ),
        ]);
    }
}
