<?php

declare(strict_types=1);

use App\Notifications\NotificationDigest;
use App\Support\Notifications\NotificationText;

it('maps notification types to human text', function (): void {
    expect(NotificationText::label('issue_assigned'))->toContain('assigned');
    expect(NotificationText::label('issue_unblocked'))->toContain('unblocked');
    expect(NotificationText::label('something_else'))->toBe('New notification');
});

it('renders the digest mail with each item text + link and an action', function (): void {
    $digest = new NotificationDigest(
        [
            ['text' => 'You were assigned an issue', 'url' => 'http://smoke.localhost/issues/abc'],
            ['text' => "An issue you're assigned was unblocked", 'url' => 'http://smoke.localhost/issues/def'],
        ],
        'Smoke',
    );

    $mail = $digest->toMail(new stdClass());
    $rendered = implode("\n", array_merge($mail->introLines, $mail->outroLines));

    expect($rendered)->toContain('You were assigned an issue');
    expect($rendered)->toContain('http://smoke.localhost/issues/abc');
    expect($mail->actionText)->not->toBeNull();
});
