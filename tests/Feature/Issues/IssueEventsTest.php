<?php

declare(strict_types=1);

use App\Events\IssueAssigned;
use App\Events\IssueCreated;
use App\Events\IssueStatusChanged;
use App\Events\IssueUnblocked;
use App\Models\Issue;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

it('broadcasts issue lifecycle events on the workspace channel', function (): void {
    $issue = new Issue(['id' => 'i-1']);
    $issue->workspace_id = 'ws-1';

    $created = new IssueCreated($issue);
    expect($created)->toBeInstanceOf(ShouldBroadcast::class);
    expect($created->broadcastOn())->toEqual(new PrivateChannel('workspace.ws-1'));
    expect($created->broadcastWith())->toBe(['id' => 'i-1']);

    $status = new IssueStatusChanged($issue, 'todo', 'in_progress');
    expect($status->broadcastOn())->toEqual(new PrivateChannel('workspace.ws-1'));
});

it('broadcasts assignment on both workspace and user channels, workspace-only when unassigned', function (): void {
    $issue = new Issue(['id' => 'i-1']);
    $issue->workspace_id = 'ws-1';

    $assigned = new IssueAssigned($issue, 'u-9');
    expect($assigned->broadcastOn())->toEqual([
        new PrivateChannel('workspace.ws-1'),
        new PrivateChannel('users.u-9'),
    ]);

    $unassigned = new IssueAssigned($issue, null);
    expect($unassigned->broadcastOn())->toEqual([new PrivateChannel('workspace.ws-1')]);
});

it('broadcasts unblock on the assignee user channel', function (): void {
    $issue = new Issue(['id' => 'i-2']);
    $issue->workspace_id = 'ws-1';

    $event = new IssueUnblocked($issue, 'u-7');
    expect($event->broadcastOn())->toEqual(new PrivateChannel('users.u-7'));
});
