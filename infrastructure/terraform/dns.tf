# ---------------------------------------------------------------------------
# Route53 Hosted Zone
#
# The hosted zone is managed outside of Terraform (created by the AWS domain
# registrar).  Both prod and staging look it up via a data source so they
# can add their own records without fighting over ownership of the zone.
# ---------------------------------------------------------------------------

data "aws_route53_zone" "root" {
  name         = var.root_domain
  private_zone = false
}

locals {
  route53_zone_id = data.aws_route53_zone.root.zone_id
}

# ---------------------------------------------------------------------------
# prod: apex  (rollinglanterns.com)  ->  app CloudFront distribution
# ---------------------------------------------------------------------------

resource "aws_route53_record" "apex_ipv4" {
  count   = var.environment == "prod" ? 1 : 0
  zone_id = local.route53_zone_id
  name    = var.root_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.app_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.app_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "apex_ipv6" {
  count   = var.environment == "prod" ? 1 : 0
  zone_id = local.route53_zone_id
  name    = var.root_domain
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.app_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.app_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

# prod: www  (www.rollinglanterns.com)  ->  app CloudFront distribution
resource "aws_route53_record" "www_ipv4" {
  count   = var.environment == "prod" ? 1 : 0
  zone_id = local.route53_zone_id
  name    = "www.${var.root_domain}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.app_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.app_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_ipv6" {
  count   = var.environment == "prod" ? 1 : 0
  zone_id = local.route53_zone_id
  name    = "www.${var.root_domain}"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.app_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.app_distribution.hosted_zone_id
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
