<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ContactRequest;
use App\Http\Resources\ContactResource;
use App\UseCases\Contacts\CreateContact;
use App\UseCases\Contacts\ListContacts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ContactController extends Controller
{
    public function __construct(private readonly ListContacts $listContacts, private readonly CreateContact $createContact) {}

    public function index(Request $request): JsonResponse
    {
        return ContactResource::collection($this->listContacts->handle($request->user()))->response();
    }

    public function store(ContactRequest $request): JsonResponse
    {
        return ContactResource::make($this->createContact->handle($request->user(), $request->validated()))->response()->setStatusCode(201);
    }
}
