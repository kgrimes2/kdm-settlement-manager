#!/bin/bash
API_ID="qukt5ag1z1"
USER_DATA_ID="6u6dye"
SETTLEMENT_ID="iswwol"

terraform import aws_api_gateway_integration_response.get_user_data_cors $API_ID/$SETTLEMENT_ID/GET/200 2>&1 | tail -1
terraform import aws_api_gateway_integration_response.save_user_data_cors $API_ID/$SETTLEMENT_ID/POST/200 2>&1 | tail -1
terraform import aws_api_gateway_integration_response.delete_user_data_cors $API_ID/$SETTLEMENT_ID/DELETE/200 2>&1 | tail -1
terraform import aws_api_gateway_integration_response.cors_user_data $API_ID/$USER_DATA_ID/OPTIONS/200 2>&1 | tail -1
terraform import aws_api_gateway_integration_response.cors_settlement $API_ID/$SETTLEMENT_ID/OPTIONS/200 2>&1 | tail -1
echo "Done!"
