#!/bin/bash
API_ID="qukt5ag1z1"
USER_DATA_ID="6u6dye"
SETTLEMENT_ID="iswwol"

echo "Importing remaining method responses..."
terraform import aws_api_gateway_method_response.get_user_data_400 $API_ID/$SETTLEMENT_ID/GET/400 2>&1 | tail -1
terraform import aws_api_gateway_method_response.get_user_data_403 $API_ID/$SETTLEMENT_ID/GET/403 2>&1 | tail -1
terraform import aws_api_gateway_method_response.get_user_data_cors $API_ID/$SETTLEMENT_ID/GET/200 2>&1 | tail -1

terraform import aws_api_gateway_method_response.save_user_data_403 $API_ID/$SETTLEMENT_ID/POST/403 2>&1 | tail -1
terraform import aws_api_gateway_method_response.save_user_data_cors $API_ID/$SETTLEMENT_ID/POST/200 2>&1 | tail -1

terraform import aws_api_gateway_method_response.delete_user_data_400 $API_ID/$SETTLEMENT_ID/DELETE/400 2>&1 | tail -1
terraform import aws_api_gateway_method_response.delete_user_data_403 $API_ID/$SETTLEMENT_ID/DELETE/403 2>&1 | tail -1
terraform import aws_api_gateway_method_response.delete_user_data_cors $API_ID/$SETTLEMENT_ID/DELETE/200 2>&1 | tail -1

terraform import aws_api_gateway_method_response.get_all_user_data_403 $API_ID/$USER_DATA_ID/GET/403 2>&1 | tail -1

echo "Done!"
