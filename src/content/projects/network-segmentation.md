---
title: "Segmenting a Home Network Without Breaking It"
summary: "Rebuilt a flat home network into four VLANs behind pfSense, then solved the service-discovery problems that segmentation creates."
date: 2025-11-01
stack:
  - pfSense
  - Dell N3048EP-ON
  - Cisco C9130
  - Avahi
  - Tailscale
featured: true
draft: false
---

## The problem

My home network was flat. A single subnet carried workstations, servers,
cameras, IoT devices, and guest traffic, which meant every device on it could
reach every other device. Cheap smart plugs with firmware I had no visibility
into sat on the same broadcast domain as the server holding my backups.

The obvious fix is segmentation. The reason people avoid it is that
segmentation breaks the things that make a home network pleasant to use:
Chromecast discovery, AirPlay, network printers, and NAS browsing all depend
on multicast and broadcast traffic that does not cross a routed boundary.

## The design

I settled on four VLANs, chosen by trust level rather than device type:

| VLAN | Purpose | Outbound | Inbound |
|---|---|---|---|
| 10 | Trusted — workstations, phones | Any | From nothing |
| 20 | Servers — hypervisor, NAS, services | Any | From VLAN 10 only |
| 30 | IoT — cameras, plugs, TVs | Internet only | From VLAN 10 only |
| 40 | Guest | Internet only | From nothing |

The important rule is VLAN 30. IoT devices get internet access and nothing
else — no route to servers, no route to workstations. If a camera's firmware
is compromised, the blast radius is that VLAN.

pfSense runs on a Dell Wyse 5070 handling routing and firewalling between
segments. A Dell N3048EP-ON carries the VLANs as 802.1Q trunks and provides
PoE to the cameras and access point. A Cisco C9130 maps each SSID to its
VLAN, so joining the guest network puts a device on VLAN 40 without any
client configuration.

## What broke, and why

Segmentation worked immediately. Everything convenient stopped working just
as fast.

**mDNS is link-local by design.** Bonjour and Chromecast discovery use
multicast on 224.0.0.251, and that address is explicitly not routed. A phone
on VLAN 10 could not see a speaker on VLAN 30 because the discovery packets
never left their own segment. Fixed with an mDNS repeater on pfSense
(Avahi), reflecting between the two VLANs — and only those two, since
reflecting into the guest VLAN would defeat its purpose.

**SSDP and WS-Discovery use broadcast, not multicast.** UPnP and Windows
network browsing needed a separate solution: a UDP broadcast relay forwarding
those specific ports across segments, rather than opening the firewall
generally.

**Multicast video flooded the switch.** Streaming to a Chromecast pushed
multicast frames out every port on the VLAN, including ones with nothing
listening. Enabling IGMP snooping on the switch, with pfSense acting as
querier, restricted those frames to ports that had actually joined the group.
Without a querier on the segment, snooping silently does nothing — the switch
has no membership table to build.

**Remote access needed to survive the change.** Tailscale runs on pfSense as
a subnet router and exit node, so remote access follows the same firewall
rules as local traffic rather than bypassing them.

## Outcome

Four segments, each with explicit rules about what it can reach. IoT devices
have no path to anything that matters. Guest traffic sees only the internet.
The convenience features still work, but through narrow, intentional
exceptions rather than an open network.

The part worth taking away: segmentation is easy, and the discovery protocols
that break afterward are the actual work. Each fix had to be as narrow as the
problem, or the segmentation becomes decorative.
