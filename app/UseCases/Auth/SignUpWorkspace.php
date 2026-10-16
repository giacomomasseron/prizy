<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use App\Models\User;
use App\Models\Workspace;
use App\Notifications\VerifyEmail;
use App\Repositories\UserRepository;
use App\Services\LoginHandoff;
use App\Services\WorkspaceUrl;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Throwable;

final class SignUpWorkspace
{
    public function __construct(
        private readonly UserRepository $userRepository,
    ) {}

    /**
     * Create a new Workspace and its owner User in a single transaction, then
     * dispatch the verification notification OUTSIDE it so a mail-driver
     * failure cannot roll back a valid signup.
     *
     * Nobody is logged in here: this runs on the sign-up host, whose session
     * the workspace never sees. Instead the owner gets a one-time login link
     * on the workspace's own host (LoginHandoff).
     *
     * With app.signup_requires_activation on (the public cloud), the workspace
     * is created pending instead: no hostname reaches it until the owner clicks
     * the emailed link (MarkEmailVerified), which is when they get logged in.
     *
     * @param  array<string, mixed>  $data  Validated input (workspace_name, slug, name, email, password)
     * @return array{workspace: Workspace, user: User, activation_required: bool, workspace_url: string, login_url: string|null}
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

        // Notify AFTER the transaction commits so a mail-driver exception
        // cannot roll back the user/workspace rows.
        try {
            $user->notify(new VerifyEmail());
        } catch (Throwable $e) {
            // A pending owner can never log in to ask for the link again, so
            // the workspace would only hold its slug until the prune. Undo it,
            // so the person can simply sign up again.
            if ($pending) {
                $workspace->forceDelete();

                throw $e;
            }

            // A live workspace's owner logs in below and can ask for another.
            report($e);
        }

        return [
            'workspace'           => $workspace,
            'user'                => $user,
            'activation_required' => $pending,
            'workspace_url'       => WorkspaceUrl::for($workspace),
            'login_url'           => $pending ? null : LoginHandoff::url($user, $workspace),
        ];
    }
}
