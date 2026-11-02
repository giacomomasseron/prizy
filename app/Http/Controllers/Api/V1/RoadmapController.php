<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\RoadmapProjectResource;
use App\UseCases\Roadmap\ListRoadmap;
use Illuminate\Http\JsonResponse;

final class RoadmapController extends Controller
{
    public function index(): JsonResponse
    {
        return RoadmapProjectResource::collection(ListRoadmap::run())->response();
    }
}
