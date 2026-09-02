---
title: "Building and Self-Hosting This Site"
summary: "A static portfolio built with Astro, containerized with Caddy, published by CI, and served from a home rack with no inbound ports open."
date: 2026-09-01
stack:
  - Astro
  - Caddy
  - Docker
  - GitHub Actions
  - Cloudflare Tunnel
  - TrueNAS SCALE
featured: true
draft: false
---

## The problem

A portfolio site has two audiences with incompatible needs. A recruiter wants
to know in forty seconds whether I am worth a call. An engineer wants to know
whether I can actually do the work. Optimizing for the first produces
something forgettable; optimizing for the second produces something a
recruiter closes.

I decided the content would serve the first audience and the infrastructure
would serve the second. This page is the second half.

## Constraints I set

**No dynamic backend.** No database, no server-side rendering, no admin
login. Every page is HTML generated on my laptop before deployment. There is
nothing on the server assembling responses, which means there is nothing to
inject into. This is not hardening applied to a vulnerable system; it is the
absence of the system that would have needed hardening.

**No inbound ports.** My home network should not gain an opening because I
wanted a website.

**Content as data.** My entire resume lives in one JSON file. The site reads
from it. Updating a job title is a one-line edit, not a layout exercise.

**It should survive my internet going down.** Self-hosting is the point, but a
recruiter hitting a dead link because my power blinked is worse than not
self-hosting at all.

## How it is built

The site is [Astro](https://astro.build), which renders components to HTML at
build time and discards the component code. The result ships almost no
JavaScript — the only script on the page is a few hundred bytes that resolves
the light or dark theme before first paint, so the wrong theme never flashes.

Resume content is a single JSON file following the
[JSON Resume](https://jsonresume.org/) schema, validated against a Zod schema
at build time. A malformed date or a broken email address fails the build
rather than reaching production. Project write-ups like this one are Markdown
with typed frontmatter, so a missing summary is a build error too.

Design is hand-written CSS built on custom properties. Every color, size, and
spacing value is defined once at the top of one file. Dark mode is a second
block overriding those same names — no component knows a theme exists.

## Containerizing it

The image is built in two stages. The first installs Node and runs the site
build. The second starts from a clean Caddy image and copies in only the
built output. The entire toolchain is discarded.

The result is about 50 MB and contains a web server and some HTML. There is
no Node runtime, no package manager, and no shell tooling in the running
container — nothing to exploit that is not the web server itself.

Caddy serves on port 8080 rather than 80, because the container runs with
Linux capabilities dropped and cannot bind a privileged port. It sets a
strict Content-Security-Policy, HSTS, `nosniff`, and a restrictive
Permissions-Policy, and strips the `Server` header.

## Deploying it

My laptop is Apple Silicon, so a locally built image is `arm64`. The server is
`x86_64`. Rather than cross-building under emulation every time and hoping I
remember the flag, GitHub Actions builds the image on a native x86 runner and
pushes it to the GitHub Container Registry.

Every build produces two tags: `latest`, and an immutable tag containing the
commit SHA. The second one is what makes rollback real — if a deploy breaks
something, the previous image still exists and can be pinned by hash.

The container runs on a Dell PowerEdge R640 under TrueNAS SCALE, alongside the
rest of my homelab.

## Reaching it from the internet

There is no port forward. A `cloudflared` container makes an outbound-only
connection to Cloudflare, and traffic arrives through that tunnel. My
residential IP never appears in DNS, and my firewall has no inbound rules for
this service.

The containers sit on an isolated VLAN whose firewall policy permits outbound
443 to Cloudflare and nothing else — no route to my server or trusted
segments. If the web server were compromised, the reachable surface is that
VLAN.

## What I would do differently

The Content-Security-Policy allows inline scripts, because the theme-
resolution script has to be inline to prevent a flash of the wrong theme.
The correct fix is a SHA-256 hash of that script in the policy. I left it out
because the hash breaks silently whenever the script changes by one
character, and a security control that fails quietly is worse than an honest
gap. On a static site with no user input there is no injection path for the
policy to defend against, so this is a real but narrow compromise.

## On using AI

I built this with Claude, Anthropic's assistant, as a working partner —
asking it to explain concepts, review approaches, and draft code and prose I
then read, corrected, and tested.

I am saying so because pretending otherwise would be dishonest, and because
how someone uses these tools is itself worth knowing. I did not accept output
I could not explain. Several recommendations turned out to be wrong or
outdated and had to be caught and corrected. The architecture decisions here
are ones I understand and can defend in a conversation, which is the only
standard that matters when the person asking is an interviewer.
