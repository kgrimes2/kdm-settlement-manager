# ---------------------------------------------------------------------------
# Apex / www Redirect  (prod only)
#
# rollinglanterns.com     -> https://rollinglanterns.com/app
# www.rollinglanterns.com -> https://rollinglanterns.com/app
#
# A CloudFront Function handles every request at the viewer-request stage,
# issuing a 301 before CloudFront ever contacts an origin.  The function is
# attached to the main app_distribution (see frontend.tf) so there is no
# need for a separate distribution.
# ---------------------------------------------------------------------------

resource "aws_cloudfront_function" "apex_redirect" {
  count   = var.environment == "prod" ? 1 : 0
  name    = "${var.app_name}-apex-redirect"
  runtime = "cloudfront-js-2.0"
  comment = "Redirect apex/www to /app"
  publish = true

  # Redirect rules:
  #   /          -> /app
  #   /app       -> /app  (idempotent, avoids redirect loop)
  #   /app/...   -> /app/... (pass through — handled by the app distribution)
  #   anything else -> /app
  #
  # Note: www requests are also sent here via the www DNS alias, so we
  # canonicalise to the bare apex as well.
  code = <<-EOF
    function handler(event) {
      var request = event.request;
      var uri = request.uri;
      var host = "https://${var.root_domain}";

      // Already at /app or a path under /app — nothing to do
      if (uri === "/app" || uri.startsWith("/app/")) {
        return request;
      }

      // Everything else (including /) -> redirect to /app
      return {
        statusCode: 301,
        statusDescription: "Moved Permanently",
        headers: {
          location: { value: host + "/app" }
        }
      };
    }
  EOF
}
