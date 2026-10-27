import React, { useState } from 'react';
import { AlertTriangle, Zap, Shield, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { config } from '../utils/config';

const PanicButton = ({ walletAddress, caseId, onPanicTriggered }) => {
  const [loading, setLoading] = useState(false);
  const [panicTriggered, setPanicTriggered] = useState(false);

  const handlePanic = async () => {
    const confirm = window.confirm(
      `🚨 PANIC BUTTON ACTIVATION 🚨\n\n` +
      `Wallet: ${walletAddress}\n` +
      `Case: ${caseId || 'N/A'}\n\n` +
      `This will:\n` +
      `• Notify RBI & CERT immediately\n` +
      `• Request bank account freeze\n` +
      `• Escalate to highest priority\n` +
      `• Trigger emergency protocols\n\n` +
      `Are you sure you want to proceed?`
    );

    if (!confirm) return;

    try {
      setLoading(true);
      
      const response = await axios.post(`${config.backendUrl}/api/panic/${walletAddress}`, {
        reason: 'Emergency panic button activation',
        severity: 'CRITICAL',
        notifyExternal: true
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.data.success) {
        setPanicTriggered(true);
        
        // Show success message with details
        alert(
          `🚨 PANIC WORKFLOW ACTIVATED 🚨\n\n` +
          `Case ID: ${response.data.data.caseId}\n` +
          `Wallet: ${response.data.data.walletAddress}\n` +
          `Status: ${response.data.data.status}\n` +
          `Escalation Level: ${response.data.data.escalationLevel}\n` +
          `External Notifications: ${response.data.data.externalNotificationsSent ? 'SENT' : 'FAILED'}\n\n` +
          `All emergency protocols have been triggered!`
        );
        
        // Callback to parent component
        if (onPanicTriggered) {
          onPanicTriggered(response.data.data);
        }
      } else {
        alert('❌ Failed to activate panic workflow');
      }
    } catch (error) {
      console.error('Panic button error:', error);
      alert(`❌ Panic workflow failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handlePanic}
        disabled={loading || panicTriggered}
        className={`
          relative px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform
          ${panicTriggered 
            ? 'bg-gray-500 cursor-not-allowed' 
            : loading 
              ? 'bg-orange-600 animate-pulse' 
              : 'bg-red-600 hover:bg-red-700 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
          }
          ${!panicTriggered && !loading ? 'animate-pulse' : ''}
        `}
      >
        <div className="flex items-center space-x-2">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>ACTIVATING...</span>
            </>
          ) : panicTriggered ? (
            <>
              <Shield className="w-5 h-5" />
              <span>PANIC ACTIVATED</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 animate-bounce" />
              <span>🚨 PANIC BUTTON</span>
              <Zap className="w-5 h-5 animate-pulse" />
            </>
          )}
        </div>
        
        {/* Warning indicator */}
        {!panicTriggered && !loading && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
        )}
      </button>
      
      {/* Info tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
        Emergency escalation to RBI & CERT
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
};

export default PanicButton;

