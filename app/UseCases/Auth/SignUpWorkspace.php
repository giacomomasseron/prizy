<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use App\Models\User;
use App\Models\Workspace;
use App\Notifications\VerifyEmail;
use App\Repositories\UserRepository;
use App\Services\WorkspaceUrl;
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
     * Create a new Workspace and its owner User in a single transaction,
     * then log the user in and dispatch the verification notification OUTSIDE
     * the transaction so a mail-driver failure cannot roll back a valid signup
     * or leave the session pointing at a rolled-back user.
     *
     * With app.signup_requires_activation on (the public cloud), the workspace
     * is created pending instead: no hostname reaches it until the owner clicks
     * the emailed link (MarkEmailVerified), so nobody is logged in here.
     *
     * @param  array<string, mixed>  $data  Validated input (workspace_name, slug, name, email, password)
     * @return array{workspace: Workspace, user: User, activation_required: bool, workspace_url: string}
     */
    public function handle(array $data): array
    {
        $pending = (bool) config('app.signup_requires_activation');

        [$workspace, $user] = DB::transaction(function () use ($data, $pending): array {
            // Generate the UUID in PHP so the model has its key immediately;
            // Eloquent does not fetch the Postgres-generated UUID back for
            // non-incrementing models, so $workspace->id would be null otherwise.
            $attributes = [
                'id'   => (string) Str::uuid(),
                'name' => $data['workspace_name'],
                'slug' => $data['slug'],
            ];
            if ($pending) {
                // An explicit NULL overrides the column's DEFAULT now().
                $attributes['activated_at'] = null;
            }
            $workspace = Workspace::forceCreate($attributes);

            // Make this workspace current so the BelongsToWorkspace creating-hook
            // auto-fills workspace_id on the new User row.
            $workspace->makeCurrent();

            $user = $this->userRepository->create([
                'name'          => $data['name'],
                'email'         => $data['email'],
                'password_hash' => Hash::make($data['password']),
                'admin_level'   => 'owner',
            ]);

            return [$workspace, $user];
        });

        // Authenticate and notify AFTER the transaction commits so a mail-driver
        // exception cannot roll back the user/workspace rows or leave an auth
        // session pointing at a non-existent user.
        if (! $pending) {
            Auth::login($user);
        }
        $user->notify(new VerifyEmail());

        return [
            'workspace'           => $workspace,
            'user'                => $user,
            'activation_required' => $pending,
            'workspace_url'       => WorkspaceUrl::for($workspace),
        ];
    }
}
