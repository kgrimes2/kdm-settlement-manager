# ---------------------------------------------------------------------------
# Route53 Hosted Zone
#
# The hosted zone is a global/shared resource (one per domain).  We create it
# in the prod workspace and look it up in staging so both workspaces can add
# their own records without fighting over ownership of the zone resource.
# ---------------------------------------------------------------------------

resource "aws_route53_zone" "root" {
  count = var.environment == "prod" ? 1 : 0
  name  = var.root_domain

  tags = {
    Name        = var.root_domain
    Environment = var.environment
  }
}

data "aws_route53_zone" "root" {
  count        = var.environment != "prod" ? 1 : 0
  name         = var.root_domain
  private_zone = false
}

locals {
  route53_zone_id = var.environment == "prod" ? aws_route53_zone.root[0].zone_id : data.aws_route53_zone.root[0].zone_id
}

# ---------------------------------------------------------------------------
# prod: apex  (rollinglanterns.com)  ->  apex_redirect CloudFront distribution
# ---------------------------------------------------------------------------

resource "aws_route53_record" "apex_ipv4" {
  count   = var.environment == "prod" ? 1 : 0
  zone_id = local.route53_zone_id
  name    = var.root_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.apex_redirect[0].domain_name
    zone_id                = aws_cloudfront_distribution.apex_redirect[0].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "apex_ipv6" {
  count   = var.environment == "prod" ? 1 : 0
  zone_id = local.route53_zone_id
  name    = var.root_domain
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.apex_redirect[0].domain_name
    zone_id                = aws_cloudfront_distribution.apex_redirect[0].hosted_zone_id
    evaluate_target_health = false
  }
}

# prod: www  (www.rollinglanterns.com)  ->  apex_redirect CloudFront distribution
resource "aws_route53_record" "www_ipv4" {
  count   = var.environment == "prod" ? 1 : 0
  zone_id = local.route53_zone_id
  name    = "www.${var.root_domain}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.apex_redirect[0].domain_name
    zone_id                = aws_cloudfront_distribution.apex_redirect[0].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_ipv6" {
  count   = var.environment == "prod" ? 1 : 0
  zone_id = local.route53_zone_id
  name    = "www.${var.root_domain}"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.apex_redirect[0].domain_name
    zone_id                = aws_cloudfront_distribution.apex_redirect[0].hosted_zone_id
    evaluate_target_health = false
  }
}

# ---------------------------------------------------------------------------
# staging: staging.rollinglanterns.com  ->  app CloudFront distribution
# ---------------------------------------------------------------------------

resource "aws_route53_record" "staging_ipv4" {
  count   = var.environment != "prod" ? 1 : 0
  zone_id = local.route53_zone_id
  name    = local.app_host
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.app_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.app_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "staging_ipv6" {
  count   = var.environment != "prod" ? 1 : 0
  zone_id = local.route53_zone_id
  name    = local.app_host
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.app_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.app_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}
