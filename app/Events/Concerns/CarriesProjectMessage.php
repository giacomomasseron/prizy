<?php

declare(strict_types=1);

namespace App\Events\Concerns;

use App\Http\Resources\ProjectMessageResource;
use App\Models\ProjectMessage;
use Illuminate\Broadcasting\PrivateChannel;

/**
 * A chat message sent whole on its project's channel (PRD §3.2.11), so open chats show it without a refetch.
 *
 * Reverb refuses an HTTP request over 10,000 bytes (config/reverb.php, max_request_size), and the Pusher protocol
 * carries the payload JSON-encoded inside a JSON body — so a long message, or one in a script whose characters
 * encode as \uXXXX, would never arrive. Past PAYLOAD_BUDGET bytes the event carries only the message's id and
 * project, and open chats refetch.
 */
trait CarriesProjectMessage
{
    private const PAYLOAD_BUDGET = 8_000;

    public readonly string $projectId;

    /** @var array<string, mixed> The message as the API returns it, taken when the event is made. */
    public readonly array $message;

    public function __construct(ProjectMessage $message)
    {
        $this->projectId = $message->project_id;
        $whole = (new ProjectMessageResource($message))->resolve();
        $this->message = strlen(json_encode(json_encode($whole, JSON_THROW_ON_ERROR), JSON_THROW_ON_ERROR)) <= self::PAYLOAD_BUDGET
            ? $whole
            : ['id' => $message->id, 'project_id' => $message->project_id];
    }

    /** @return list<PrivateChannel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('project.' . $this->projectId)];
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return $this->message;
    }
}
