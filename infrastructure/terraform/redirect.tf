# ---------------------------------------------------------------------------
# Apex / www Redirect  (prod only)
#
# rollinglanterns.com     -> https://rollinglanterns.com/app
# www.rollinglanterns.com -> https://rollinglanterns.com/app
#
# A CloudFront Function handles every request at the viewer-request stage,
# issuing a 301 before CloudFront ever contacts an origin.  A minimal S3
# bucket is required as a placeholder origin (it is never actually reached).
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

# Placeholder S3 origin (never actually reached)
resource "aws_s3_bucket" "apex_redirect" {
  count  = var.environment == "prod" ? 1 : 0
  bucket = "${var.app_name}-${var.environment}-apex-redirect-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.app_name}-apex-redirect"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "apex_redirect" {
  count  = var.environment == "prod" ? 1 : 0
  bucket = aws_s3_bucket.apex_redirect[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "apex_redirect" {
  count                             = var.environment == "prod" ? 1 : 0
  name                              = "OAC for ${var.app_name}-${var.environment} apex redirect"
  description                       = "OAC for apex redirect placeholder bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "apex_redirect" {
  count       = var.environment == "prod" ? 1 : 0
  enabled     = true
  comment     = "Apex/www redirect: ${var.root_domain} -> /app"
  price_class = "PriceClass_100"

  # Handles both bare apex and www
  aliases = [var.root_domain, "www.${var.root_domain}"]

  origin {
    domain_name              = aws_s3_bucket.apex_redirect[0].bucket_regional_domain_name
    origin_id                = "S3ApexRedirect"
    origin_access_control_id = aws_cloudfront_origin_access_control.apex_redirect[0].id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3ApexRedirect"
    compress         = false

    # Caching disabled — the Function short-circuits every request
    cache_policy_id = data.aws_cloudfront_cache_policy.caching_disabled.id

    viewer_protocol_policy = "redirect-to-https"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.apex_redirect[0].arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.app.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name        = "${var.app_name}-apex-redirect"
    Environment = var.environment
  }

  depends_on = [aws_acm_certificate_validation.app]
}
