#!/bin/bash
API_ID="qukt5ag1z1"
USER_DATA_ID="6u6dye"
SETTLEMENT_ID="iswwol"

echo "Importing integrations..."
terraform import aws_api_gateway_integration.get_all_user_data $API_ID/$USER_DATA_ID/GET 2>&1 | grep -E "(Import|Error)" | head -2
terraform import aws_api_gateway_integration.cors_user_data $API_ID/$USER_DATA_ID/OPTIONS 2>&1 | grep -E "(Import|Error)" | head -2
terraform import aws_api_gateway_integration.get_user_data $API_ID/$SETTLEMENT_ID/GET 2>&1 | grep -E "(Import|Error)" | head -2
terraform import aws_api_gateway_integration.save_user_data $API_ID/$SETTLEMENT_ID/POST 2>&1 | grep -E "(Import|Error)" | head -2
terraform import aws_api_gateway_integration.delete_user_data $API_ID/$SETTLEMENT_ID/DELETE 2>&1 | grep -E "(Import|Error)" | head -2
terraform import aws_api_gateway_integration.cors_settlement $API_ID/$SETTLEMENT_ID/OPTIONS 2>&1 | grep -E "(Import|Error)" | head -2
