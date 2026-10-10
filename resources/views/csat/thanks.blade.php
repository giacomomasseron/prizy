<!doctype html>
<html lang="en">
<head>
    @include('help.partials.head')
    <meta name="robots" content="noindex">
    <title>Thanks for your feedback — Prizy</title>
</head>
<body>
    <main id="content" class="hc-solo">
        <div class="hc-card hc-solo__card">
            <div class="hc-solo__brand"><span class="hc-mark" aria-hidden="true">P</span><span class="hc-brand__name">Prizy</span></div>
            <div class="hc-solo__emoji" aria-hidden="true">{{ $rating === 'thumbs_up' ? '👍' : '👎' }}</div>
            <h1 class="hc-solo__title">Thanks — your feedback was recorded</h1>
            <p class="hc-solo__text">
                You rated “{{ $subject }}” as {{ $rating === 'thumbs_up' ? 'good' : 'poor' }}.
                Clicked the wrong link? Use the other link in your email to change your answer.
            </p>
        </div>
    </main>
</body>
</html>
