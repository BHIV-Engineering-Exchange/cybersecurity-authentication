// services/chainOfCustodyService.js
const Evidence = require('../models/Evidence');
const EscalationLog = require('../models/EscalationLog');
const RiskModel = require('../models/RiskModel');
const RequestLog = require('../models/RequestLog');
const Report = require('../models/Report');
const geoip = require('geoip-lite');

class ChainOfCustodyService {
  constructor() {
    // Timeline event types
    this.EVENT_TYPES = {
      REPORT_SUBMITTED: 'report_submitted',
      EVIDENCE_UPLOADED: 'evidence_uploaded',
      RISK_ASSESSMENT: 'risk_assessment',
      IP_TRACED: 'ip_traced',
      ESCALATION: 'escalation',
      VERIFICATION: 'verification',
      ACTION_TAKEN: 'action_taken'
    };
  }

  // Generate comprehensive timeline for a case/entity
  async generateTimeline(caseId, entity = null) {
    try {
      const events = [];

      // 1. Get reports
      const reportQuery = caseId ? { caseId } : { entityId: entity };
      const reports = await Report.find(reportQuery).sort({ createdAt: 1 });
      
      for (const report of reports) {
        events.push({
          type: this.EVENT_TYPES.REPORT_SUBMITTED,
          timestamp: report.createdAt,
          caseId: report.caseId || caseId,
          entity: report.entityId,
          data: {
            reportId: report._id,
            reason: report.reason,
            severity: report.severity,
            riskLevel: report.riskLevel,
            riskScore: report.riskScore,
            status: report.status,
            tags: report.tags,
            ipGeo: report.ipGeo,
            source: report.source
          },
          description: `Report submitted: ${report.reason}`,
          icon: '📋',
          priority: this.getPriority(report.severity, report.riskScore)
        });

        // Add IP tracing event if geolocation data exists
        if (report.ipGeo && (report.ipGeo.lat || report.ipGeo.lon)) {
          events.push({
            type: this.EVENT_TYPES.IP_TRACED,
            timestamp: new Date(report.createdAt.getTime() + 1000), // Slightly after report
            caseId: report.caseId || caseId,
            entity: report.entityId,
            data: {
              reportId: report._id,
              ipGeo: report.ipGeo,
              city: report.ipGeo.city,
              org: report.ipGeo.org,
              coordinates: {
                lat: report.ipGeo.lat,
                lon: report.ipGeo.lon
              }
            },
            description: `IP traced to ${report.ipGeo.city || 'Unknown'}, ${report.ipGeo.org || 'Unknown'}`,
            icon: '🌐',
            priority: 'medium'
          });
        }
      }

      // 2. Get evidence uploads
      const evidenceQuery = caseId ? { caseId } : { entity };
      const evidenceList = await Evidence.find(evidenceQuery).sort({ uploadedAt: 1 });
      
      for (const evidence of evidenceList) {
        events.push({
          type: this.EVENT_TYPES.EVIDENCE_UPLOADED,
          timestamp: evidence.uploadedAt,
          caseId: evidence.caseId,
          entity: evidence.entity,
          data: {
            evidenceId: evidence._id,
            filename: evidence.originalFilename,
            fileType: evidence.fileType,
            fileSize: evidence.fileSize,
            fileHash: evidence.fileHash,
            storageHash: evidence.storageHash,
            ipfsHash: evidence.ipfsHash,
            blockchainTxHash: evidence.blockchainTxHash,
            blockNumber: evidence.blockNumber,
            riskLevel: evidence.riskLevel,
            verificationStatus: evidence.verificationStatus,
            integrityStatus: evidence.integrityStatus,
            redundancyCount: evidence.redundancyCount,
            storageLocations: evidence.storageLocations,
            uploadedBy: evidence.uploadedBy,
            tags: evidence.tags,
            description: evidence.description
          },
          description: `Evidence uploaded: ${evidence.originalFilename}`,
          icon: '📎',
          priority: this.getEvidencePriority(evidence.riskLevel, evidence.verificationStatus)
        });

        // Add verification event if evidence was verified
        if (evidence.lastVerified) {
          events.push({
            type: this.EVENT_TYPES.VERIFICATION,
            timestamp: evidence.lastVerified,
            caseId: evidence.caseId,
            entity: evidence.entity,
            data: {
              evidenceId: evidence._id,
              verificationStatus: evidence.verificationStatus,
              integrityStatus: evidence.integrityStatus,
              redundancyCount: evidence.redundancyCount,
              blockchainTxHash: evidence.blockchainTxHash
            },
            description: `Evidence verified: ${evidence.integrityStatus}`,
            icon: evidence.integrityStatus === 'intact' ? '✅' : '❌',
            priority: evidence.integrityStatus === 'intact' ? 'low' : 'high'
          });
        }
      }

      // 3. Get escalation logs
      const escalationQuery = caseId ? { caseId } : { entity };
      const escalations = await EscalationLog.find(escalationQuery).sort({ createdAt: 1 });
      
      for (const escalation of escalations) {
        events.push({
          type: this.EVENT_TYPES.ESCALATION,
          timestamp: escalation.createdAt,
          caseId: escalation.caseId,
          entity: escalation.entity,
          data: {
            escalationId: escalation._id,
            riskScore: escalation.riskScore,
            trigger: escalation.trigger,
            webhookResponse: escalation.webhookResponse,
            success: !escalation.webhookResponse?.error
          },
          description: `Escalation ${escalation.trigger}: Risk score ${escalation.riskScore}`,
          icon: '🚨',
          priority: 'high'
        });
      }

      // 4. Get risk assessments
      const riskQuery = entity ? { wallet: entity } : {};
      if (riskQuery.wallet) {
        const riskAssessments = await RiskModel.find(riskQuery).sort({ updatedAt: 1 });
        
        for (const risk of riskAssessments) {
          events.push({
            type: this.EVENT_TYPES.RISK_ASSESSMENT,
            timestamp: risk.updatedAt,
            caseId: caseId,
            entity: risk.wallet,
            data: {
              riskId: risk._id,
              level: risk.level,
              reportCount: risk.reportCount,
              lastFlaggedBy: risk.lastFlaggedBy,
              lastReason: risk.lastReason,
              lastSeverity: risk.lastSeverity,
              lastFlaggedAt: risk.lastFlaggedAt
            },
            description: `Risk assessment updated: ${risk.level} (${risk.reportCount} reports)`,
            icon: this.getRiskIcon(risk.level),
            priority: this.getRiskPriority(risk.level)
          });
        }
      }

      // 5. Get request logs for additional tracking
      const requestQuery = entity ? { path: { $regex: entity } } : {};
      if (requestQuery.path) {
        const requestLogs = await RequestLog.find(requestQuery)
          .sort({ timestamp: 1 })
          .limit(50); // Limit to avoid too many entries
        
        for (const reqLog of requestLogs) {
          // Only include significant actions
          if (this.isSignificantRequest(reqLog.method, reqLog.path)) {
            const ipGeo = geoip.lookup(reqLog.ip);
            
            events.push({
              type: this.EVENT_TYPES.ACTION_TAKEN,
              timestamp: reqLog.timestamp,
              caseId: caseId,
              entity: entity,
              data: {
                requestId: reqLog._id,
                method: reqLog.method,
                path: reqLog.path,
                user: reqLog.user,
                ip: reqLog.ip,
                ipGeo: ipGeo ? {
                  city: ipGeo.city,
                  region: ipGeo.region,
                  country: ipGeo.country,
                  org: ipGeo.org,
                  lat: ipGeo.ll?.[0],
                  lon: ipGeo.ll?.[1]
                } : null
              },
              description: `Action: ${reqLog.method} ${this.getPathDescription(reqLog.path)}`,
              icon: this.getActionIcon(reqLog.method, reqLog.path),
              priority: 'low'
            });
          }
        }
      }

      // Sort all events by timestamp
      events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Add sequence numbers and calculate time gaps
      events.forEach((event, index) => {
        event.sequence = index + 1;
        if (index > 0) {
          const prevTime = new Date(events[index - 1].timestamp);
          const currTime = new Date(event.timestamp);
          event.timeGap = Math.floor((currTime - prevTime) / 1000); // seconds
        }
      });

      return {
        success: true,
        timeline: events,
        summary: {
          totalEvents: events.length,
          eventTypes: this.getEventTypeCounts(events),
          timespan: events.length > 0 ? {
            start: events[0].timestamp,
            end: events[events.length - 1].timestamp,
            duration: this.calculateDuration(events[0].timestamp, events[events.length - 1].timestamp)
          } : null,
          riskProgression: this.calculateRiskProgression(events),
          keyMilestones: this.identifyKeyMilestones(events)
        }
      };
    } catch (error) {
      console.error('Timeline generation error:', error);
      return {
        success: false,
        error: error.message,
        timeline: []
      };
    }
  }

  // Generate timeline for multiple related entities (case linking)
  async generateLinkedTimeline(entities, investigationId = null) {
    try {
      const allEvents = [];
      
      for (const entity of entities) {
        const entityTimeline = await this.generateTimeline(null, entity);
        if (entityTimeline.success) {
          // Mark events with entity source
          entityTimeline.timeline.forEach(event => {
            event.sourceEntity = entity;
            event.investigationId = investigationId;
            allEvents.push(event);
          });
        }
      }

      // Sort by timestamp
      allEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Re-sequence
      allEvents.forEach((event, index) => {
        event.sequence = index + 1;
      });

      return {
        success: true,
        timeline: allEvents,
        entities,
        investigationId,
        summary: {
          totalEvents: allEvents.length,
          entitiesInvolved: entities.length,
          eventTypes: this.getEventTypeCounts(allEvents),
          crossEntityConnections: this.findCrossEntityConnections(allEvents),
          timespan: allEvents.length > 0 ? {
            start: allEvents[0].timestamp,
            end: allEvents[allEvents.length - 1].timestamp,
            duration: this.calculateDuration(allEvents[0].timestamp, allEvents[allEvents.length - 1].timestamp)
          } : null
        }
      };
    } catch (error) {
      console.error('Linked timeline generation error:', error);
      return {
        success: false,
        error: error.message,
        timeline: []
      };
    }
  }

  // Helper methods
  getPriority(severity, riskScore) {
    if (severity >= 4 || riskScore >= 80) return 'high';
    if (severity >= 3 || riskScore >= 60) return 'medium';
    return 'low';
  }

  getEvidencePriority(riskLevel, verificationStatus) {
    if (riskLevel === 'high' || verificationStatus === 'failed') return 'high';
    if (riskLevel === 'medium') return 'medium';
    return 'low';
  }

  getRiskIcon(level) {
    switch (level?.toLowerCase()) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }

  getRiskPriority(level) {
    switch (level?.toLowerCase()) {
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  }

  isSignificantRequest(method, path) {
    const significantPaths = [
      '/api/evidence/upload',
      '/api/evidence/verify',
      '/api/escalate',
      '/api/reports',
      '/api/risk',
      '/api/admin'
    ];
    
    return significantPaths.some(sigPath => path.includes(sigPath)) ||
           ['POST', 'PUT', 'DELETE'].includes(method);
  }

  getPathDescription(path) {
    if (path.includes('/evidence/upload')) return 'Evidence Upload';
    if (path.includes('/evidence/verify')) return 'Evidence Verification';
    if (path.includes('/escalate')) return 'Manual Escalation';
    if (path.includes('/reports')) return 'Report Access';
    if (path.includes('/risk')) return 'Risk Assessment';
    if (path.includes('/admin')) return 'Admin Action';
    return path.split('/').pop() || 'Unknown';
  }

  getActionIcon(method, path) {
    if (path.includes('/evidence')) return '📁';
    if (path.includes('/escalate')) return '⚠️';
    if (path.includes('/reports')) return '📊';
    if (path.includes('/admin')) return '👮';
    switch (method) {
      case 'POST': return '➕';
      case 'PUT': return '✏️';
      case 'DELETE': return '🗑️';
      default: return '👁️';
    }
  }

  getEventTypeCounts(events) {
    const counts = {};
    events.forEach(event => {
      counts[event.type] = (counts[event.type] || 0) + 1;
    });
    return counts;
  }

  calculateDuration(start, end) {
    const diff = new Date(end) - new Date(start);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} days, ${hours % 24} hours`;
    }
    if (hours > 0) {
      return `${hours} hours, ${minutes} minutes`;
    }
    return `${minutes} minutes`;
  }

  calculateRiskProgression(events) {
    const riskEvents = events.filter(e => 
      e.type === this.EVENT_TYPES.RISK_ASSESSMENT || 
      e.type === this.EVENT_TYPES.ESCALATION ||
      e.data?.riskScore !== undefined
    );

    return riskEvents.map(event => ({
      timestamp: event.timestamp,
      riskScore: event.data?.riskScore || this.convertRiskLevelToScore(event.data?.level),
      level: event.data?.level,
      type: event.type
    }));
  }

  convertRiskLevelToScore(level) {
    switch (level?.toLowerCase()) {
      case 'high': return 80;
      case 'medium': return 50;
      case 'low': return 20;
      default: return 0;
    }
  }

  identifyKeyMilestones(events) {
    const milestones = [];
    
    // First report
    const firstReport = events.find(e => e.type === this.EVENT_TYPES.REPORT_SUBMITTED);
    if (firstReport) {
      milestones.push({
        type: 'first_report',
        timestamp: firstReport.timestamp,
        description: 'Investigation initiated',
        event: firstReport
      });
    }

    // First evidence
    const firstEvidence = events.find(e => e.type === this.EVENT_TYPES.EVIDENCE_UPLOADED);
    if (firstEvidence) {
      milestones.push({
        type: 'first_evidence',
        timestamp: firstEvidence.timestamp,
        description: 'Evidence collection started',
        event: firstEvidence
      });
    }

    // First escalation
    const firstEscalation = events.find(e => e.type === this.EVENT_TYPES.ESCALATION);
    if (firstEscalation) {
      milestones.push({
        type: 'first_escalation',
        timestamp: firstEscalation.timestamp,
        description: 'Case escalated',
        event: firstEscalation
      });
    }

    // High risk events
    const highRiskEvents = events.filter(e => e.priority === 'high');
    if (highRiskEvents.length > 0) {
      milestones.push({
        type: 'high_risk_detected',
        timestamp: highRiskEvents[0].timestamp,
        description: 'High risk activity detected',
        event: highRiskEvents[0]
      });
    }

    return milestones.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  findCrossEntityConnections(events) {
    const connections = [];
    const entityEvents = {};

    // Group events by entity
    events.forEach(event => {
      if (event.sourceEntity) {
        if (!entityEvents[event.sourceEntity]) {
          entityEvents[event.sourceEntity] = [];
        }
        entityEvents[event.sourceEntity].push(event);
      }
    });

    // Find temporal connections
    const entities = Object.keys(entityEvents);
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i];
        const entity2 = entities[j];
        
        // Check for events within short time windows
        entityEvents[entity1].forEach(event1 => {
          entityEvents[entity2].forEach(event2 => {
            const timeDiff = Math.abs(new Date(event1.timestamp) - new Date(event2.timestamp));
            if (timeDiff < 300000) { // 5 minutes
              connections.push({
                entity1,
                entity2,
                event1,
                event2,
                timeDifference: timeDiff,
                connectionType: 'temporal_correlation'
              });
            }
          });
        });
      }
    }

    return connections;
  }

  // Export timeline to different formats
  async exportTimeline(caseId, entity, format = 'json') {
    const timeline = await this.generateTimeline(caseId, entity);
    
    if (!timeline.success) {
      return timeline;
    }

    switch (format.toLowerCase()) {
      case 'csv':
        return this.exportToCSV(timeline);
      case 'pdf':
        return this.exportToPDF(timeline);
      default:
        return timeline;
    }
  }

  exportToCSV(timeline) {
    const csv = [
      'Sequence,Timestamp,Type,Entity,Description,Priority,Data'
    ];

    timeline.timeline.forEach(event => {
      csv.push([
        event.sequence,
        event.timestamp,
        event.type,
        event.entity || '',
        `"${event.description}"`,
        event.priority,
        `"${JSON.stringify(event.data).replace(/"/g, '""')}"`
      ].join(','));
    });

    return {
      success: true,
      format: 'csv',
      content: csv.join('\n'),
      filename: `timeline_${Date.now()}.csv`
    };
  }

  exportToPDF(timeline) {
    // This would require a PDF generation library like puppeteer
    // For now, return structured data for PDF generation
    return {
      success: true,
      format: 'pdf',
      data: timeline,
      filename: `timeline_${Date.now()}.pdf`
    };
  }
}

module.exports = new ChainOfCustodyService();