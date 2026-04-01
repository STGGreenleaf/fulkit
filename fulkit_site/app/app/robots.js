export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/settings/", "/home/", "/chat/", "/actions/", "/threads/", "/hum/", "/fabric/", "/owner/", "/onboarding/", "/import/", "/share/"],
      },
    ],
    sitemap: "https://fulkit.app/sitemap.xml",
  };
}
