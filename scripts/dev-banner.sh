#!/usr/bin/env bash
# What `composer dev` prints just before its panes start: where the app is, the
# logins SmokeSeeder creates, and where email lands.
#
# Usage: bash scripts/dev-banner.sh

bold='' frame='' link='' reset=''
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
    bold=$'\033[1m'
    frame=$'\033[38;5;183m'
    link=$'\033[38;5;216m'
    reset=$'\033[0m'
fi

# One line of the box: label, value, and the value's colour. printf pads inside
# the colour codes, so they cannot throw the right edge off.
row() {
    printf '%s│%s  %s%-10s%s %s%-37s%s%s│%s\n' \
        "$frame" "$reset" "$bold" "$1" "$reset" "${3:-}" "$2" "$reset" "$frame" "$reset"
}

printf '\n%s╭─ %s%sPrizy dev%s%s ──────────────────────────────────────╮%s\n' \
    "$frame" "$reset" "$bold" "$reset" "$frame" "$reset"
row '' ''
row App http://smoke.localhost:8001 "$link"
row Sign-up http://localhost:8001 "$link"
row '' ''
row Logins 'password: password123'
row Owner smoke@example.com
row Developer member@example.com
row Agent agent-maya@example.com
row '' ''
row Email 'Mailpit, http://localhost:8025' "$link"
row '' ''
printf '%s╰──────────────────────────────────────────────────╯%s\n\n' "$frame" "$reset"
