<?php

declare(strict_types=1);

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

final class SendSlackMessage implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    public function __construct(
        private readonly string $webhookUrl,
        private readonly string $text,
    ) {}

    /** @return list<int> */
    public function backoff(): array
    {
        return [10, 30, 60];
    }

    public function handle(): void
    {
        Http::asJson()->post($this->webhookUrl, ['text' => $this->text])->throw();
    }

    public function failed(\Throwable $e): void
    {
        // Never log $e->getMessage() — a connection-level Guzzle exception embeds the full
        // webhook URL (incl. the secret token) in its message. Log only the exception class.
        Log::warning('Slack delivery failed after retries', ['exception' => $e::class]);
    }
}
