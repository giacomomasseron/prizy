<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use App\Models\User;
use App\Models\Workspace;
use App\Notifications\VerifyEmail;
use App\Repositories\UserRepository;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

final class SignUpWorkspace
{
    public function __construct(
        private readonly UserRepository $userRepository,
    ) {}

    /**
     * Create a new Workspace and its owner User in a single transaction.
     *
     * @param  array<string, mixed>  $data  Validated input (workspace_name, slug, name, email, password)
     * @return array{workspace: Workspace, user: User}
     */
    public function handle(array $data): array
    {
        $result = DB::transaction(function () use ($data): array {
            // Generate the UUID in PHP so the model has its key immediately;
            // Eloquent does not fetch the Postgres-generated UUID back for
            // non-incrementing models, so $workspace->id would be null otherwise.
            $workspace = Workspace::forceCreate([
                'id'   => (string) Str::uuid(),
                'name' => $data['workspace_name'],
                'slug' => $data['slug'],
            ]);

            // Make this workspace current so the BelongsToWorkspace creating-hook
            // auto-fills workspace_id on the new User row.
            $workspace->makeCurrent();

            $user = $this->userRepository->create([
                'name'          => $data['name'],
                'email'         => $data['email'],
                'password_hash' => Hash::make($data['password']),
                'admin_level'   => 'owner',
            ]);

            Auth::login($user);

            $user->notify(new VerifyEmail());

            return ['workspace' => $workspace, 'user' => $user];
        });

        return $result;
    }
}
