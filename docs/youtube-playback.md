# YouTube watch-page stability

YouTube's interactive watch pages are large JavaScript applications. Rewriting
that application through a browser proxy can be unreliable, especially once
the player starts requesting segmented video from `googlevideo.com`. Celestial's
normal Boba interface, Google verification routing and Reflux support remain.

## Video navigation

- YouTube home/search/channel pages continue to use the selected proxy engine.
- Clicking a normal YouTube watch link, entering a watch URL, or arriving
  at a watch URL via Scramjet's SPA URL watcher opens a lightweight player.
- The player is an official `www.youtube-nocookie.com/embed/<video-id>` iframe,
  not a server-side video downloader or restreaming service.
- A 48–52px Boba toolbar offers Back to browsing, Full site and Open on YouTube.
- Full site explicitly opts out for that one watch URL, preserving access to
  comments, channel features and other YouTube UI, at the cost of proxy stability.
- Only validated YouTube domains and 11-character video IDs are recognized.
  Unrelated links are never redirected.
- In cloaked tabs the parent iframe explicitly delegates media permissions.

## Why the referrer differs for the Boba page

YouTube requires an HTTP Referer (or equivalent API identification) for
embedded players. Boba's HTML response now uses
`Referrer-Policy: strict-origin-when-cross-origin`; other static assets
and application APIs retain their existing protections. The player iframe
also sets the policy explicitly.

This does not bypass YouTube age checks, login requirements, copyright
restrictions, network filtering or controls against embedding. Some videos
disallow embedding. The toolbar keeps an honest route to the original page.

## Verification

`npm run check` covers parsed URLs, untrusted hosts, start times and
watch-link interception. The GitHub Chromium smoke test verifies that a
signed-in Boba browser and an about:blank cloaked workspace both mount the
lightweight player with the expected embed origin and referrer policy.
It also retains the real Reflux + Wisp + example.com integration check.

A successful iframe mount is not proof that a particular third-party video
can play on every network, browser or account. Manual playback in the user's
environment remains the final compatibility check.
