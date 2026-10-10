<?php

declare(strict_types=1);

use App\Repositories\PortalTicketRepository;

it('colours every portal status with one of the desk colours', function (): void {
    expect(array_keys(PortalTicketRepository::STATUS_TONES))
        ->toEqualCanonicalizing(array_keys(PortalTicketRepository::STATUS_LABELS));
    expect(array_values(PortalTicketRepository::STATUS_TONES))->each->toBeIn(['blue', 'red', 'amber', 'green']);
});

it('gives each customer label one colour: statuses that share a label share a colour', function (): void {
    foreach (PortalTicketRepository::STATUS_LABELS as $status => $label) {
        foreach (PortalTicketRepository::STATUS_LABELS as $other => $otherLabel) {
            if ($label === $otherLabel) {
                expect(PortalTicketRepository::STATUS_TONES[$status])->toBe(PortalTicketRepository::STATUS_TONES[$other]);
            }
        }
    }
});

it('uses the desk colour of the status each label stands for', function (): void {
    expect(PortalTicketRepository::STATUS_TONES)
        ->toMatchArray(['new' => 'blue', 'open' => 'red', 'pending' => 'amber', 'solved' => 'green']);
});
