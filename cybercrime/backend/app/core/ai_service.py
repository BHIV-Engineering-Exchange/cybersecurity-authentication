"""
AI Service for generating intelligent conclusions
Uses OpenRouter API (free Qwen 2.5 model) for dynamic analysis
"""

import requests
from typing import Dict, List, Optional
from app.core.config import settings
from app.core.audit_logging import emit_audit_log


def generate_ai_conclusion(
    wallet: str,
    risk_score: float,
    risk_level: str,
    pattern_type: str,
    detected_patterns: List[str],
    summary: Dict,
    user_description: str,
    fallback_to_template: bool = True
) -> str:
    """
    Generate AI-powered conclusion using OpenRouter API (Qwen 2.5)
    
    Args:
        wallet: Wallet address
        risk_score: Risk score (0.0-1.0)
        risk_level: Risk level (VERY HIGH, HIGH, etc.)
        pattern_type: Detected pattern type
        detected_patterns: List of detected patterns
        summary: Transaction summary dict
        user_description: User's description of the incident
        fallback_to_template: If True, fallback to template if AI fails
    
    Returns:
        AI-generated conclusion text
    """
    try:
        # Prepare context for AI
        context = f"""Wallet Address: {wallet}
Risk Score: {risk_score:.0%}
Risk Level: {risk_level}
Pattern Type: {pattern_type}
Detected Patterns: {', '.join(detected_patterns)}
Transaction Summary:
- Total Incoming: ${summary.get('total_in', 0):,}
- Total Outgoing: ${summary.get('total_out', 0):,}
- Transaction Count: {summary.get('tx_count', 0)}
- Unique Senders: {summary.get('unique_senders', 0)}
- Unique Receivers: {summary.get('unique_receivers', 0)}

User Report: {user_description}
"""
        
        # Create prompt for AI
        prompt = f"""You are a cybercrime investigation analyst. Analyze this wallet transaction data and generate a professional, concise conclusion.

{context}

Generate a 2-3 sentence professional conclusion that:
1. Identifies the suspicious behavior pattern
2. Explains the risk level and why
3. Mentions key indicators from the transaction data
4. Uses professional, authoritative language suitable for law enforcement

Keep it concise, factual, and professional. Do not use markdown formatting."""

        # Use OpenRouter API if API key is provided
        if settings.OPENROUTER_API_KEY:
            try:
                response = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://cybercrime-investigation.local",  # Optional
                        "X-Title": "Cybercrime Investigation Dashboard"  # Optional
                    },
                    json={
                        "model": settings.OPENROUTER_MODEL,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a professional cybercrime investigation analyst. Provide concise, factual analysis suitable for law enforcement reports."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "temperature": 0.3,
                        "max_tokens": 200
                    },
                    timeout=30
                )
                
                response.raise_for_status()
                result = response.json()
                
                # Extract conclusion from OpenRouter response
                conclusion = result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                
                if conclusion and len(conclusion) > 50:
                    emit_audit_log(
                        action="ai.conclusion",
                        status="success",
                        message="AI conclusion generated.",
                        details={"model": settings.OPENROUTER_MODEL},
                    )
                    return conclusion
                else:
                    raise Exception("Empty or invalid response from AI")
                    
            except Exception as e:
                emit_audit_log(
                    action="ai.conclusion",
                    status="warning",
                    message="OpenRouter API failed.",
                    details={"error": str(e)},
                )
                raise
        
        # If no API key, raise to trigger fallback
        raise Exception("No OpenRouter API key configured")
        
    except Exception as e:
        emit_audit_log(
            action="ai.conclusion",
            status="error",
            message="AI generation failed.",
            details={"error": str(e)},
        )
        
        if fallback_to_template:
            emit_audit_log(
                action="ai.conclusion",
                status="warning",
                message="Falling back to template-based conclusion.",
            )
            return _generate_template_conclusion(
                risk_score, risk_level, pattern_type, detected_patterns
            )
        else:
            raise


def _generate_template_conclusion(
    risk_score: float,
    risk_level: str,
    pattern_type: str,
    detected_patterns: List[str]
) -> str:
    """
    Fallback template-based conclusion generator
    """
    conclusions = {
        "fraud": "This wallet exhibits behavior consistent with fraudulent activity, involving rapid fund aggregation from multiple sources followed by immediate consolidation. The pattern suggests a classic scam operation.",
        "money_laundering": "This wallet exhibits behavior consistent with money laundering via layering, involving rapid fund aggregation followed by multi-hop transfers through intermediate wallets to obscure the origin of funds.",
        "ponzi": "This wallet exhibits behavior consistent with a Ponzi scheme, showing multiple investors over time with early investors receiving returns funded by later investors.",
        "ransomware": "This wallet exhibits behavior consistent with ransomware payment collection, showing multiple round-number payments from different sources followed by periodic consolidation.",
    }
    
    base_conclusion = conclusions.get(pattern_type, "This wallet shows unusual transaction patterns that warrant further investigation.")
    
    if risk_score >= 0.8:
        severity = f"The risk score of {risk_score:.0%} indicates a very high likelihood of financial crime."
    elif risk_score >= 0.6:
        severity = f"The risk score of {risk_score:.0%} indicates a high likelihood of suspicious activity."
    else:
        severity = f"The risk score of {risk_score:.0%} indicates moderate risk requiring monitoring."
    
    return f"{base_conclusion} {severity}"


def check_ai_available() -> bool:
    """
    Check if OpenRouter API is available
    
    Returns:
        True if API is available, False otherwise
    """
    try:
        if settings.OPENROUTER_API_KEY:
            response = requests.get(
                "https://openrouter.ai/api/v1/models",
                headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"},
                timeout=5
            )
            return response.status_code == 200
        return False
    except Exception as e:
        emit_audit_log(
            action="ai.check",
            status="warning",
            message="AI availability check failed.",
            details={"error": str(e)},
        )
        return False
