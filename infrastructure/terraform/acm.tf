# ---------------------------------------------------------------------------
# ACM Certificates
#
# CloudFront requires certificates to exist in us-east-1 regardless of where
# the distribution itself is managed.  Both certs use DNS validation so
# Terraform can create the Route53 CNAME records automatically.
#
# prod    certificate: rollinglanterns.com + www.rollinglanterns.com
# staging certificate: staging.rollinglanterns.com
# ---------------------------------------------------------------------------

resource "aws_acm_certificate" "app" {
  provider    = aws.us_east_1
  domain_name = local.app_host

  # prod gets www as a SAN so the same cert works for the www -> /app redirect
  subject_alternative_names = var.environment == "prod" ? ["www.${var.root_domain}"] : []

  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${local.app_host}-cert"
    Environment = var.environment
  }
}

# DNS validation records
resource "aws_route53_record" "app_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.app.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id         = local.route53_zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "app" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.app.arn
  validation_record_fqdns = [for r in aws_route53_record.app_cert_validation : r.fqdn]
}
