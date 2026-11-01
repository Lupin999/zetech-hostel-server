# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Production images and API configuration

The website's bundled photos are imported from `src/` and copied into the
production `dist/assets/` directory by Vite. Keep those files in the repository
and deploy the latest successful build; they are not served from the API.

Netlify is configured to build from the `client` directory and publish `dist`.
Set `VITE_API_URL` in the Netlify site environment to the deployed server URL
ending in `/api`. The development fallback points to `localhost` and is not a
valid production API address.

Images stored on the server instead of bundled with the website must use the
deployed server's HTTPS `/assets/...` URL. The server serves its `assets/`
directory at `/assets`; a local filesystem path will not work in a browser.
