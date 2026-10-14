# Arcade Vault

Play retro games online and compete for the highest score.

## Spec-driven development

Features follow `/spec` and `/spec-impl`, from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills):

```bash
npx skills@latest add Klerith/fernando-skills
```

## Commands

```bash
npm run dev     # start dev server (Next.js, Turbopack)
npm run build   # production build
npm run start   # run production build
npm run lint    # ESLint
```

## Test on a phone (WSL + localtunnel)

1. Start the dev server:

   ```bash
   npm run dev
   ```

2. In a new terminal, open a public tunnel and copy the URL it prints (like `https://xxxx-xxxx.loca.lt`):

   ```bash
   npx localtunnel --port 3000
   ```

3. Get your public IP:

   ```bash
   curl ifconfig.me
   ```

4. Open the tunnel URL on your phone and enter the IP from step 3 as the Tunnel Password.

`next.config.ts` needs `allowedDevOrigins: ["*.loca.lt"]` for the tunnel to work in dev.
