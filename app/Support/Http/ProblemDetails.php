<?php

declare(strict_types=1);

namespace App\Support\Http;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Maps exceptions to RFC 7807 Problem Details (application/problem+json).
 */
final class ProblemDetails
{
    public static function render(Throwable $e, Request $request): JsonResponse
    {
        [$status, $slug, $detail, $errors] = self::classify($e);

        $body = [
            'type'   => 'https://prizy.app/problems/' . $slug,
            'title'  => Response::$statusTexts[$status] ?? 'Error',
            'status' => $status,
            'detail' => $detail,
        ];

        if ($errors !== null) {
            $body['errors'] = $errors;
        }

        $response = new JsonResponse($body, $status, ['Content-Type' => 'application/problem+json']);

        if ($e instanceof HttpExceptionInterface) {
            // Preserve Retry-After / X-RateLimit-* (and any other HTTP-exception
            // headers) without letting them override the problem+json content type.
            $response->headers->add($e->getHeaders());
            $response->headers->set('Content-Type', 'application/problem+json');
        }

        return $response;
    }

    /**
     * @return array{0:int,1:string,2:string,3:array<string,array<int,string>>|null}
     */
    private static function classify(Throwable $e): array
    {
        return match (true) {
            $e instanceof ValidationException => [422, 'validation', 'The given data was invalid.', $e->errors()],
            $e instanceof AuthenticationException => [401, 'unauthenticated', 'Unauthenticated.', null],
            $e instanceof AuthorizationException => [403, 'forbidden', 'This action is unauthorized.', null],
            $e instanceof ModelNotFoundException => [404, 'not-found', 'Resource not found.', null],
            $e instanceof HttpExceptionInterface => [
                $e->getStatusCode(),
                self::slugForStatus($e->getStatusCode()),
                $e->getMessage() ?: (Response::$statusTexts[$e->getStatusCode()] ?? 'Error'),
                null,
            ],
            default => [500, 'server-error', 'An unexpected error occurred.', null],
        };
    }

    private static function slugForStatus(int $status): string
    {
        return match ($status) {
            401 => 'unauthenticated',
            403 => 'forbidden',
            404 => 'not-found',
            429 => 'too-many-requests',
            501 => 'not-implemented',
            default => 'http-error',
        };
    }
}
