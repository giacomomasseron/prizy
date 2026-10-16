<?php

declare(strict_types=1);

/**
 * The support module has two choke points: HelpdeskAccess::gate() lets an agent
 * in to READ, gateWrite() also turns viewers away (roles.md: a viewer is
 * read-only in every module, the agent capability included). A use case that
 * changes anything and calls gate() hands a viewer the pen — which is how every
 * desk, knowledge-base, SLA and saved-view write came to accept viewers until
 * 2026-10.
 *
 * So gate() is allowed only in the reads listed below — an allowlist a future
 * author has to edit, and therefore justify, rather than a naming pattern a new
 * write can slip past. Everything else that asks for support access must ask
 * gateWrite().
 */
it('lets only the listed reads use the read-only helpdesk gate', function (): void {
    $root = realpath(__DIR__.'/../../app');

    $reads = [
        'UseCases/Tickets/ListTickets.php',
        'UseCases/Tickets/CountTickets.php',
        'UseCases/Tickets/FindTicket.php',
        'UseCases/Contacts/ListContacts.php',
        'UseCases/Kb/ShowKbLibrary.php',
        'UseCases/Kb/FindKbArticleForEdit.php',
        'UseCases/Kb/ListKbArticleVersions.php',
        'UseCases/Kb/ShowKbArticleVersion.php',
        'UseCases/Kb/ListKbArticleTranslations.php',
        'UseCases/Kb/ShowKbArticleTranslation.php',
        'UseCases/Kb/PreviewKbMarkdown.php',        // renders the posted markdown, stores nothing
        'UseCases/SlaPolicies/ListSlaPolicies.php',
        'UseCases/SlaPolicies/FindSlaPolicy.php',
        'UseCases/BusinessHours/ListSchedules.php',
        'UseCases/BusinessHours/FindSchedule.php',
        'UseCases/HelpdeskSavedViews/ListHelpdeskSavedViews.php',
        'UseCases/HelpdeskSavedReports/ListHelpdeskSavedReport.php',
        'UseCases/Reports/OverviewReport.php',
        'UseCases/Reports/AgentsReport.php',
        'UseCases/Reports/SlaReport.php',
    ];

    $readGateCallers = [];
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root)) as $file) {
        if ($file->getExtension() !== 'php') {
            continue;
        }
        // A call, not a mention: comments name gate() too (TicketPolicy's does).
        if (preg_match('/HelpdeskAccess::gate\s*\(\s*\$/', (string) file_get_contents($file->getPathname())) === 1) {
            $readGateCallers[] = str_replace($root.'/', '', $file->getPathname());
        }
    }
    sort($readGateCallers);
    sort($reads);

    // Both ways: a write on the read gate fails, and so does a listed read that
    // moved or stopped asking (the list must not keep stale exemptions).
    expect($readGateCallers)->toBe($reads);
});

// The allowlist above only catches a write that asks the wrong gate. A support
// use case that asks NEITHER (a hand-rolled is_agent check, or none) would pass
// it, so every use case in the support folders must ask one of the two.
it('makes every support use case ask a helpdesk gate', function (): void {
    $root = realpath(__DIR__.'/../../app/UseCases');

    $folders = ['Tickets', 'Contacts', 'Kb', 'SlaPolicies', 'BusinessHours', 'HelpdeskSavedViews', 'HelpdeskSavedReports'];
    $exempt = [
        'Tickets/RecordCsatResponse.php', // the customer's signed rating link: no agent is acting
    ];

    $ungated = [];
    foreach ($folders as $folder) {
        foreach (glob($root.'/'.$folder.'/*.php') ?: [] as $path) {
            $relative = $folder.'/'.basename($path);
            if (in_array($relative, $exempt, true)) {
                continue;
            }
            if (preg_match('/HelpdeskAccess::gate(Write)?\s*\(\s*\$/', (string) file_get_contents($path)) !== 1) {
                $ungated[] = $relative;
            }
        }
    }

    expect($ungated)->toBe([]);
});
