#!/usr/bin/env bash
#
# Follows an invitation the way people do: sign up, confirm the address, sign
# in, invite someone, then open the link in the email they receive and join.
# All of it over real HTTP and through real mail. Pest checks the pieces; this
# is the proof that they meet, and the emailed link once answered 405 with
# every test green.
#
# Needs the dev stack running (docker compose up), Mailpit included.
set -euo pipefail

app=http://localhost:8001
workspace=http://ci-invite.localhost:8001
mailpit=http://localhost:8025/api/v1
password=Ci-check-Passw0rd-7f3a

# One cookie jar per browser and host: a jar holding two XSRF tokens is ambiguous.
signup_jar=$(mktemp)
owner_jar=$(mktemp)
invitee_jar=$(mktemp)
trap 'rm -f "$signup_jar" "$owner_jar" "$invitee_jar"' EXIT

fail() {
    echo "FAIL: $*" >&2
    exit 1
}

# The XSRF token in a jar, decoded for the header.
xsrf() {
    awk '$6 == "XSRF-TOKEN" { print $7 }' "$1" |
        python3 -c 'import sys, urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))'
}

# post <jar> <url> <json>: a session POST with its CSRF token, as the app sends it.
post() {
    curl -sS --fail-with-body -o /dev/null -b "$1" -c "$1" "$2" \
        -H 'Accept: application/json' -H 'Content-Type: application/json' \
        -H "X-XSRF-TOKEN: $(xsrf "$1")" -d "$3"
}

# mail_to <address>: the newest message to that address, as Mailpit's JSON.
mail_to() {
    local id
    id=$(curl -fsS -G "$mailpit/search" --data-urlencode "query=to:$1" | jq -r '.messages[0].ID // empty')
    [ -n "$id" ] || fail "no email reached $1"
    curl -fsS "$mailpit/message/$id"
}

echo '== Sign up and confirm the address'
curl -fsS -c "$signup_jar" -o /dev/null "$app/"
post "$signup_jar" "$app/workspaces" \
    "{\"workspace_name\":\"CI invite\",\"slug\":\"ci-invite\",\"name\":\"CI Owner\",\"email\":\"owner@example.com\",\"password\":\"$password\"}"
verify=$(mail_to owner@example.com | jq -r .Text | grep -oE 'https?://[^[:space:]]*/verify-email/[^[:space:]]*' | head -n 1) ||
    fail "the verification email has no link"
curl -fsS -L -o /dev/null "$verify"

echo '== Sign in and invite someone'
curl -fsS -c "$owner_jar" -o /dev/null "$workspace/login"
post "$owner_jar" "$workspace/login" "{\"email\":\"owner@example.com\",\"password\":\"$password\"}"
post "$owner_jar" "$workspace/invitations" \
    '{"email":"new@example.com","admin_level":"member","is_developer":true,"is_agent":false}'

echo '== The email has both parts, and the same link in each'
message=$(mail_to new@example.com)
link=$(jq -r .Text <<<"$message" | grep -oE 'https?://[^[:space:]]*/invitations/[^[:space:]]*/accept' | head -n 1) ||
    fail "the plain-text part has no accept link"
html=$(jq -r .HTML <<<"$message")
grep -qF "$link" <<<"$html" || fail "the HTML part does not carry the link $link"

echo "== Opening $link"
page=$(curl -fsS -c "$invitee_jar" "$link") || fail "the link did not open a page"
grep -qF 'id="app"' <<<"$page" || fail "the link did not serve the app"

curl -fsS -b "$invitee_jar" -c "$invitee_jar" -H 'Accept: application/json' "${link%/accept}" |
    jq -e '.email == "new@example.com" and .workspace_name == "CI invite" and .inviter_name == "CI Owner"' >/dev/null ||
    fail "the page cannot read the invitation"

echo '== Accepting signs them in'
post "$invitee_jar" "$link" "{\"name\":\"New Member\",\"password\":\"$password\"}"
curl -fsS -b "$invitee_jar" -H 'Accept: application/json' "$workspace/v1/me" |
    jq -e '(.data // .).email == "new@example.com"' >/dev/null ||
    fail "the new member is not signed in"

echo 'OK: the invitation works from the email to the app'
