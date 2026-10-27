"""Test script to verify the analyze_wallet_description function"""
import sys
import traceback

try:
    from app.api.v1.endpoints.incidents import analyze_wallet_description, analyze_wallet_incident
    print("✓ Successfully imported analyze_wallet_description")
    print("✓ Successfully imported analyze_wallet_incident")
    
    # Test the function
    result = analyze_wallet_description("This is a test scam wallet")
    print(f"✓ Function executed successfully: {result}")
    
except Exception as e:
    print(f"✗ Error: {e}")
    traceback.print_exc()
