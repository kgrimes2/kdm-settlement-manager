#!/bin/bash
API_ID="qukt5ag1z1"
USER_DATA_ID="6u6dye"
SETTLEMENT_ID="iswwol"

# Method responses for GET /user-data
terraform import aws_api_gateway_method_response.get_all_user_data_200 $API_ID/$USER_DATA_ID/GET/200 2>&1 | tail -1
terraform import aws_api_gateway_method_response.get_all_user_data_401 $API_ID/$USER_DATA_ID/GET/401 2>&1 | tail -1
terraform import aws_api_gateway_method_response.get_all_user_data_500 $API_ID/$USER_DATA_ID/GET/500 2>&1 | tail -1
terraform import aws_api_gateway_method_response.cors_user_data $API_ID/$USER_DATA_ID/OPTIONS/200 2>&1 | tail -1

# Method responses for GET /user-data/{settlement_id}
terraform import aws_api_gateway_method_response.get_user_data_200 $API_ID/$SETTLEMENT_ID/GET/200 2>&1 | tail -1
terraform import aws_api_gateway_method_response.get_user_data_404 $API_ID/$SETTLEMENT_ID/GET/404 2>&1 | tail -1
terraform import aws_api_gateway_method_response.get_user_data_401 $API_ID/$SETTLEMENT_ID/GET/401 2>&1 | tail -1
terraform import aws_api_gateway_method_response.get_user_data_500 $API_ID/$SETTLEMENT_ID/GET/500 2>&1 | tail -1

# Method responses for POST /user-data/{settlement_id}
terraform import aws_api_gateway_method_response.save_user_data_200 $API_ID/$SETTLEMENT_ID/POST/200 2>&1 | tail -1
terraform import aws_api_gateway_method_response.save_user_data_400 $API_ID/$SETTLEMENT_ID/POST/400 2>&1 | tail -1
terraform import aws_api_gateway_method_response.save_user_data_401 $API_ID/$SETTLEMENT_ID/POST/401 2>&1 | tail -1
terraform import aws_api_gateway_method_response.save_user_data_413 $API_ID/$SETTLEMENT_ID/POST/413 2>&1 | tail -1
terraform import aws_api_gateway_method_response.save_user_data_500 $API_ID/$SETTLEMENT_ID/POST/500 2>&1 | tail -1

# Method responses for DELETE /user-data/{settlement_id}
terraform import aws_api_gateway_method_response.delete_user_data_200 $API_ID/$SETTLEMENT_ID/DELETE/200 2>&1 | tail -1
terraform import aws_api_gateway_method_response.delete_user_data_401 $API_ID/$SETTLEMENT_ID/DELETE/401 2>&1 | tail -1
terraform import aws_api_gateway_method_response.delete_user_data_404 $API_ID/$SETTLEMENT_ID/DELETE/404 2>&1 | tail -1
terraform import aws_api_gateway_method_response.delete_user_data_500 $API_ID/$SETTLEMENT_ID/DELETE/500 2>&1 | tail -1

# Method responses for OPTIONS /user-data/{settlement_id}
terraform import aws_api_gateway_method_response.cors_settlement $API_ID/$SETTLEMENT_ID/OPTIONS/200 2>&1 | tail -1

echo "Method responses imported!"
