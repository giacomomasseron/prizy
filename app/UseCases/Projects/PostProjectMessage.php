<?php

declare(strict_types=1);

namespace App\UseCases\Projects;

use App\Events\ProjectMessagePosted;
use App\Models\Project;
use App\Models\ProjectMessage;
use App\Models\User;
use App\Repositories\IssueRepository;
use App\Repositories\ProjectMessageRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Post a message in a project's chat (PRD §3.2.11), linking the issues picked while writing it. Every linked issue
 * must be a live issue of the workspace (another workspace's or a deleted one → 422). Once the message is saved it
 * goes out on the project's channel, and the people it mentions are notified.
 */
final class PostProjectMessage
{
    public function __construct(
        private readonly ProjectMessageRepository $messages,
        private readonly IssueRepository $issues,
        private readonly NotifyChatMentions $mentions,
    ) {}

    /** @param list<string> $issueIds */
    public function handle(User $actor, Project $project, string $body, array $issueIds): ProjectMessage
    {
        if (count($this->issues->findManyByIds($issueIds)) !== count($issueIds)) {
            throw ValidationException::withMessages(['issue_ids' => ['The selected issues are invalid.']]);
        }

        $events = [];
        $message = DB::transaction(function () use ($actor, $project, $body, $issueIds, &$events): ProjectMessage {
            $message = $this->messages->create($project->id, $actor->id, $body, $issueIds);
            $events = $this->mentions->handle($actor, $project, $message);

            return $message;
        });

        event(new ProjectMessagePosted($message));
        foreach ($events as $event) {
            event($event);
        }

        return $message;
    }
}
