import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function will be rendered in global scope, so use
// <script> tags to define global variables.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/*
          This link tag is essential for iOS PWA icons.
          We use /openroutes/ because of the basePath in app.json.
        */}
        <link rel="apple-touch-icon" href="/openroutes/apple-touch-icon.png" />
        <link rel="manifest" href="/openroutes/manifest.json" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape hatch to ensure the background is white */}
        <style dangerouslySetInnerHTML={{ __html: `body { background-color: #fff; }` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
