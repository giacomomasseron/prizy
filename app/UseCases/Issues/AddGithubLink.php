<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\IssueGithubLink;
use App\Models\User;
use App\Repositories\GithubLinkRepository;
use App\Support\Integrations\GithubUrl;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method static IssueGithubLink run(User $actor, string $issueId, string $url)
 */
final class AddGithubLink extends BaseUseCase implements UseCaseInterface
{
    private readonly GithubLinkRepository $links;

    public function handle(mixed ...$arguments): mixed
    {
        $this->links = app(GithubLinkRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(User $actor, string $issueId, string $url): IssueGithubLink
    {
        $parsed = GithubUrl::parse($url);
        if ($parsed === null) {
            throw ValidationException::withMessages(['url' => 'Enter a GitHub pull request URL.']);
        }

        foreach ($this->links->forIssue($issueId) as $existing) {
            if ($existing->url === $url) {
                throw ValidationException::withMessages(['url' => 'That pull request is already linked.']);
            }
        }

        return $this->links->create([
            'issue_id'   => $issueId,
            'repo'       => $parsed['repo'],
            'number'     => $parsed['number'],
            'url'        => $url,
            'source'     => 'manual',
            'created_by' => $actor->id,
        ]);
    }
}
