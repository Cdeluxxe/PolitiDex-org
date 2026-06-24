// Serves the Firebase Web API key to the browser at request time so it never
// has to be hardcoded in index.html (which would expose it in source control
// and trip the Netlify secrets scanner).
//
// The value comes from the Netlify environment variable FIREBASE_API_KEY.
// index.html loads this as `<script src="/firebase-config.js">` before it
// initializes Firebase, which sets window.__FIREBASE_API_KEY__.
export default async () => {
  const apiKey = Netlify.env.get("FIREBASE_API_KEY") ?? "";

  const body = `window.__FIREBASE_API_KEY__=${JSON.stringify(apiKey)};`;

  return new Response(body, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      // Always reflect the current env var; never cache the injected value.
      "cache-control": "no-store",
    },
  });
};

export const config = { path: "/firebase-config.js" };
