<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ListTicketsRequest;
use App\Http\Requests\Api\V1\PatchTicketRequest;
use App\Http\Requests\Api\V1\StoreTicketRequest;
use App\Http\Resources\TicketMessageResource;
use App\Http\Resources\TicketResource;
use App\UseCases\Tickets\ChangeTicketStatus;
use App\UseCases\Tickets\CreateTicket;
use App\UseCases\Tickets\FindTicket;
use App\UseCases\Tickets\ListTickets;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class TicketController extends Controller
{
    public function __construct(
        private readonly ListTickets $listTickets,
        private readonly FindTicket $findTicket,
        private readonly ChangeTicketStatus $changeTicketStatus,
        private readonly CreateTicket $createTicket,
    ) {}

    public function index(ListTicketsRequest $request): JsonResponse
    {
        $tickets = $this->listTickets->handle($request->user(), $request->filters());

        return TicketResource::collection($tickets)->response();
    }

    public function store(StoreTicketRequest $request): JsonResponse
    {
        $ticket = $this->createTicket->handle($request->user(), $request->validated());

        return (new TicketResource($ticket))->response()->setStatusCode(201);
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

    public function update(PatchTicketRequest $request, string $ticket): JsonResponse
    {
        $model = $this->changeTicketStatus->handle(
            $request->user(),
            $ticket,
            (string) $request->validated('status'),
        );

        return (new TicketResource($model))->response();
    }
}
