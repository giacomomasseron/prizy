{{-- The Help Center's <head> essentials, shared with the survey-rating pages (csat/*): the theme before the first
     paint, the app's fonts and the Help Center stylesheet. The theme: a choice made in the app on this browser
     ("prizy-theme") wins; otherwise the visitor's OS setting, followed live. Without JavaScript the page is light. --}}
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>
(function () {
    var root = document.documentElement, stored = null, os = null;
    try { stored = localStorage.getItem('prizy-theme'); } catch (e) {}
    try { os = window.matchMedia('(prefers-color-scheme: dark)'); } catch (e) {}
    function apply() {
        root.dataset.theme = stored === 'dark' || (stored !== 'light' && os !== null && os.matches) ? 'dark' : 'light';
    }
    apply();
    if (stored !== 'dark' && stored !== 'light' && os !== null && os.addEventListener) os.addEventListener('change', apply);
})();
</script>
@fonts
@vite('resources/css/help.css')
