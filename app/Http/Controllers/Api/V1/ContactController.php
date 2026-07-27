<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ContactResource;
use App\UseCases\Contacts\ListContacts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ContactController extends Controller
{
    public function __construct(private readonly ListContacts $listContacts) {}

    public function index(Request $request): JsonResponse
    {
        return ContactResource::collection($this->listContacts->handle($request->user()))->response();
    }
}
