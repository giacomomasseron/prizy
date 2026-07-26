<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\TicketResource;
use App\UseCases\Tickets\ListTickets;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class TicketController extends Controller
{
    public function __construct(private readonly ListTickets $listTickets) {}

    public function index(Request $request): JsonResponse
    {
        $tickets = $this->listTickets->handle($request->user());

        return TicketResource::collection($tickets)->response();
    }
}
