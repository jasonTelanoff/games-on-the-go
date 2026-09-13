# Hosting on your phone

The server is one Node process that serves the game page **and** the
websocket server on a single port. Your Pixel can run it directly —
no separate web host needed.

## Option A: same WiFi / hotspot (simplest)

Everyone must be on the same network: your home WiFi, or your phone's
hotspot with everyone joined to it.

### 1. Install Termux

- Install Termux from F-Droid (not the Play Store — that build is stale).
- Open it and run:
  ```sh
  pkg update && pkg install -y nodejs git unzip
  ```

### 2. Get the code onto the phone

Pick one:

- **Download the zip** on the phone, then in Termux:
  ```sh
  cd ~ && unzip ~/storage/downloads/party-games.zip -d party-games && cd party-games
  ```
  (Run `termux-setup-storage` first to access downloads.)
- **From your laptop** while both are on the same WiFi, on the laptop:
  ```sh
  cd party-games && python3 -m http.server 8000
  ```
  then on the phone (Termux): `curl -O http://<laptop-ip>:8000/party-games.zip`

### 3. Run it

```sh
cd ~/party-games
npm install
termux-wake-lock          # keep Android from killing Termux
PORT=8080 npm run serve
```

On startup the server prints its addresses, e.g.:

```
party-games server running!
  On this device: http://localhost:8080
  On your network, players open:
    http://192.168.43.1:8080
  Whoever joins first is the host.
```

Leave Termux in the foreground (or at least don't swipe it away).

### 4. Tell players the address

Read the "On your network" URL from the startup output and share it —
players open it in their mobile browser, enter a name, and they're in.
No codes, no typing server addresses.

**The host** is whoever joins first — so join from your own phone before
sharing the URL, and only you will see the Start button. If you
disconnect, the next-earliest connected player becomes host (and keeps
it when you return). Reconnect with the same name to reclaim your seat.

## Option B: play across networks (tunnel)

Same as above, plus one step. In a second Termux session:

```sh
pkg install -y cloudflared   # or download the ARM64 binary from GitHub
cloudflared tunnel --url http://localhost:8080
```

It prints a public URL like `https://abc-123.trycloudflare.com`.
Players open **that** URL — the page and the websocket both run through
the tunnel, so it's `wss://` end to end and browsers don't complain.
The URL changes every time you restart the tunnel; read the new one out.
Join from your own phone first so you're the host, then share the URL.

## Game-night checklist

- [ ] Phone plugged in (hotspot + screen drain the battery)
- [ ] Termux wake lock on, session in the foreground
- [ ] If anyone runs a VPN on their phone, they pause it (VPNs eat local traffic)
- [ ] Coffee-shop / guest WiFis often block device-to-device traffic —
      your own hotspot is the reliable option

## Troubleshooting

- **"Could not reach the server"**: wrong IP/port, or the phone's
  hotspot isolated the client. Double-check the IP with the command above.
- **Server dies when the screen sleeps**: `termux-wake-lock` wasn't run,
  or battery optimization is killing Termux (Android Settings → Apps →
  Termux → Battery → Unrestricted).
- **Tunnel URL works for the page but the game won't connect**: you opened
  the page over plain `http://` — use the `https://` tunnel URL so the
  websocket upgrades to `wss://`.
