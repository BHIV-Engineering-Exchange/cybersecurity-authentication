// services/reportGenerationService.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const Evidence = require('../models/Evidence');
const Report = require('../models/Report');
const EscalationLog = require('../models/EscalationLog');
const RiskModel = require('../models/RiskModel');
const chainOfCustodyService = require('./chainOfCustodyService');
const reportTemplateService = require('./reportTemplateService');

class ReportGenerationService {
  constructor() {
    this.templatesDir = path.join(__dirname, '..', 'templates', 'reports');
    this.outputDir = path.join(__dirname, '..', 'storage', 'reports');
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.templatesDir, this.outputDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Generate comprehensive case report
  async generateCaseReport(caseId, options = {}) {
    try {
      const {
        format = 'pdf',
        includeEvidence = true,
        includeTimeline = true,
        includeRiskEvolution = true,
        includeEscalations = true,
        watermark = false
      } = options;

      // Gather all data
      const reportData = await this.gatherCaseData(caseId);
      
      if (!reportData.success) {
        return { success: false, error: reportData.error };
      }

      // Generate HTML content
      const htmlContent = reportTemplateService.generateCaseHTML(reportData.data, options);
      
      // Generate PDF or return HTML
      if (format === 'pdf') {
        const pdfPath = await this.generatePDF(htmlContent, `case_report_${caseId}_${Date.now()}`, options);
        return {
          success: true,
          format: 'pdf',
          filePath: pdfPath,
          filename: path.basename(pdfPath),
          data: reportData.data
        };
      } else {
        return {
          success: true,
          format: 'html',
          content: htmlContent,
          data: reportData.data
        };
      }
    } catch (error) {
      console.error('Case report generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate entity investigation report
  async generateEntityReport(entity, options = {}) {
    try {
      const entityData = await this.gatherEntityData(entity);
      
      if (!entityData.success) {
        return { success: false, error: entityData.error };
      }

      const htmlContent = reportTemplateService.generateEntityHTML(entityData.data, options);
      
      if (options.format === 'pdf') {
        const pdfPath = await this.generatePDF(htmlContent, `entity_report_${entity}_${Date.now()}`, options);
        return {
          success: true,
          format: 'pdf',
          filePath: pdfPath,
          filename: path.basename(pdfPath),
          data: entityData.data
        };
      } else {
        return {
          success: true,
          format: 'html',
          content: htmlContent,
          data: entityData.data
        };
      }
    } catch (error) {
      console.error('Entity report generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Gather comprehensive case data
  async gatherCaseData(caseId) {
    try {
      const data = {
        caseId,
        generatedAt: new Date(),
        reports: [],
        evidence: [],
        escalations: [],
        riskHistory: [],
        timeline: null,
        summary: {}
      };

      // Get reports
      const reports = await Report.find({ caseId }).sort({ createdAt: 1 });
      data.reports = reports;

      // Get evidence
      const evidence = await Evidence.find({ caseId }).sort({ uploadedAt: 1 });
      data.evidence = evidence;

      // Get escalations
      const escalations = await EscalationLog.find({ caseId }).sort({ createdAt: 1 });
      data.escalations = escalations;

      // Get risk history for involved entities
      const entities = [...new Set(reports.map(r => r.entityId))];
      for (const entity of entities) {
        const riskHistory = await RiskModel.find({ wallet: entity }).sort({ updatedAt: 1 });
        data.riskHistory.push(...riskHistory.map(r => ({ ...r.toObject(), entity })));
      }

      // Get comprehensive timeline
      const timelineResult = await chainOfCustodyService.generateTimeline(caseId);
      if (timelineResult.success) {
        data.timeline = timelineResult;
      }

      // Calculate summary statistics
      data.summary = {
        totalReports: reports.length,
        totalEvidence: evidence.length,
        totalEscalations: escalations.length,
        entitiesInvolved: entities.length,
        entities,
        riskLevels: this.calculateRiskDistribution(reports),
        timespan: this.calculateTimespan(reports, evidence, escalations),
        currentStatus: this.determineCurrentStatus(reports, escalations),
        evidenceIntegrity: this.calculateEvidenceIntegrity(evidence),
        keyFindings: this.extractKeyFindings(data)
      };

      return { success: true, data };
    } catch (error) {
      console.error('Error gathering case data:', error);
      return { success: false, error: error.message };
    }
  }

  // Gather entity-specific data
  async gatherEntityData(entity) {
    try {
      const data = {
        entity,
        generatedAt: new Date(),
        reports: [],
        evidence: [],
        escalations: [],
        riskHistory: [],
        timeline: null,
        summary: {}
      };

      // Get reports for this entity
      const reports = await Report.find({ entityId: entity }).sort({ createdAt: 1 });
      data.reports = reports;

      // Get evidence for this entity
      const evidence = await Evidence.find({ entity }).sort({ uploadedAt: 1 });
      data.evidence = evidence;

      // Get escalations for this entity
      const escalations = await EscalationLog.find({ entity }).sort({ createdAt: 1 });
      data.escalations = escalations;

      // Get risk history
      const riskHistory = await RiskModel.find({ wallet: entity }).sort({ updatedAt: 1 });
      data.riskHistory = riskHistory;

      // Get timeline
      const timelineResult = await chainOfCustodyService.generateTimeline(null, entity);
      if (timelineResult.success) {
        data.timeline = timelineResult;
      }

      // Calculate summary
      data.summary = {
        totalReports: reports.length,
        totalEvidence: evidence.length,
        totalEscalations: escalations.length,
        currentRiskLevel: riskHistory.length > 0 ? riskHistory[riskHistory.length - 1].level : 'Unknown',
        riskProgression: this.calculateRiskProgression(riskHistory),
        evidenceTypes: this.categorizeEvidence(evidence),
        reportingPattern: this.analyzeReportingPattern(reports),
        keyEvents: this.identifyKeyEvents(data)
      };

      return { success: true, data };
    } catch (error) {
      console.error('Error gathering entity data:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper methods for calculations
  calculateRiskDistribution(reports) {
    const distribution = { low: 0, medium: 0, high: 0 };
    reports.forEach(report => {
      const level = report.riskLevel?.toLowerCase() || 'low';
      if (distribution.hasOwnProperty(level)) {
        distribution[level]++;
      }
    });
    return distribution;
  }

  calculateTimespan(reports, evidence, escalations) {
    const allDates = [
      ...reports.map(r => r.createdAt),
      ...evidence.map(e => e.uploadedAt),
      ...escalations.map(esc => esc.createdAt)
    ].filter(Boolean);

    if (allDates.length === 0) return null;

    const earliest = new Date(Math.min(...allDates));
    const latest = new Date(Math.max(...allDates));
    
    return {
      start: earliest,
      end: latest,
      duration: this.formatDuration(latest - earliest)
    };
  }

  determineCurrentStatus(reports, escalations) {
    if (escalations.length > 0) return 'Escalated';
    if (reports.some(r => r.status === 'pending')) return 'Active';
    return 'Under Review';
  }

  calculateEvidenceIntegrity(evidence) {
    if (evidence.length === 0) return { total: 0, intact: 0, percentage: 100 };
    
    const intact = evidence.filter(e => e.integrityStatus === 'intact').length;
    return {
      total: evidence.length,
      intact,
      percentage: Math.round((intact / evidence.length) * 100)
    };
  }

  extractKeyFindings(data) {
    const findings = [];
    
    if (data.summary.totalEscalations > 0) {
      findings.push(`Case has been escalated ${data.summary.totalEscalations} times`);
    }
    
    if (data.summary.evidenceIntegrity.percentage < 100) {
      findings.push(`Evidence integrity concerns: ${data.summary.evidenceIntegrity.intact}/${data.summary.evidenceIntegrity.total} files verified`);
    }
    
    if (data.summary.entitiesInvolved > 1) {
      findings.push(`Multiple entities involved (${data.summary.entitiesInvolved}), suggesting potential coordination`);
    }
    
    const highRiskReports = data.reports.filter(r => r.riskLevel === 'high').length;
    if (highRiskReports > 0) {
      findings.push(`${highRiskReports} high-risk reports identified`);
    }
    
    return findings.length > 0 ? findings : ['No significant findings identified'];
  }

  formatDuration(milliseconds) {
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} days, ${hours} hours`;
    if (hours > 0) return `${hours} hours`;
    return `${Math.floor(milliseconds / (1000 * 60))} minutes`;
  }

  calculateRiskProgression(riskHistory) {
    return riskHistory.map((risk, index) => ({
      sequence: index + 1,
      level: risk.level,
      date: risk.updatedAt,
      reportCount: risk.reportCount
    }));
  }

  categorizeEvidence(evidence) {
    const types = {};
    evidence.forEach(item => {
      const type = item.fileType || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  analyzeReportingPattern(reports) {
    if (reports.length === 0) return 'No reports';
    
    const timeGaps = [];
    for (let i = 1; i < reports.length; i++) {
      const gap = new Date(reports[i].createdAt) - new Date(reports[i-1].createdAt);
      timeGaps.push(gap);
    }
    
    const avgGap = timeGaps.reduce((sum, gap) => sum + gap, 0) / timeGaps.length;
    const avgHours = avgGap / (1000 * 60 * 60);
    
    if (avgHours < 1) return 'Rapid succession';
    if (avgHours < 24) return 'Regular';
    return 'Sporadic';
  }

  identifyKeyEvents(data) {
    const events = [];
    
    if (data.reports.length > 0) {
      events.push({
        type: 'First Report',
        date: data.reports[0].createdAt,
        description: `Initial report: ${data.reports[0].reason}`
      });
    }
    
    if (data.evidence.length > 0) {
      events.push({
        type: 'First Evidence',
        date: data.evidence[0].uploadedAt,
        description: `Evidence submitted: ${data.evidence[0].originalFilename}`
      });
    }
    
    if (data.escalations.length > 0) {
      events.push({
        type: 'First Escalation',
        date: data.escalations[0].createdAt,
        description: `Case escalated with risk score: ${data.escalations[0].riskScore}`
      });
    }
    
    return events.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // Generate PDF from HTML
  async generatePDF(htmlContent, filename, options = {}) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfPath = path.join(this.outputDir, `${filename}.pdf`);
      
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        displayHeaderFooter: true,
        headerTemplate: `<div style="font-size: 10px; margin: 0 auto; color: #666;">Fraud Investigation Report - Generated ${new Date().toLocaleDateString()}</div>`,
        footerTemplate: `<div style="font-size: 10px; margin: 0 auto; color: #666;"><span class="pageNumber"></span> of <span class="totalPages"></span></div>`
      });
      
      return pdfPath;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // Generate linked investigation report for multiple entities
  async generateLinkedReport(entities, investigationId, options = {}) {
    try {
      const linkedData = await this.gatherLinkedData(entities, investigationId);
      
      if (!linkedData.success) {
        return { success: false, error: linkedData.error };
      }

      const htmlContent = reportTemplateService.generateLinkedHTML(linkedData.data, options);
      
      if (options.format === 'pdf') {
        const pdfPath = await this.generatePDF(htmlContent, `linked_report_${investigationId}_${Date.now()}`, options);
        return {
          success: true,
          format: 'pdf',
          filePath: pdfPath,
          filename: path.basename(pdfPath),
          data: linkedData.data
        };
      } else {
        return {
          success: true,
          format: 'html',
          content: htmlContent,
          data: linkedData.data
        };
      }
    } catch (error) {
      console.error('Linked report generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Gather linked investigation data
  async gatherLinkedData(entities, investigationId) {
    try {
      const data = {
        investigationId,
        entities,
        generatedAt: new Date(),
        individualData: {},
        linkedTimeline: null,
        connections: [],
        summary: {}
      };

      // Gather data for each entity
      for (const entity of entities) {
        const entityData = await this.gatherEntityData(entity);
        if (entityData.success) {
          data.individualData[entity] = entityData.data;
        }
      }

      // Get linked timeline
      const linkedResult = await chainOfCustodyService.generateLinkedTimeline(entities, investigationId);
      if (linkedResult.success) {
        data.linkedTimeline = linkedResult;
        data.connections = linkedResult.summary.crossEntityConnections || [];
      }

      // Calculate cross-entity summary
      data.summary = {
        totalEntities: entities.length,
        totalEvents: data.linkedTimeline?.timeline?.length || 0,
        totalConnections: data.connections.length,
        riskDistribution: this.calculateCrossEntityRiskDistribution(data.individualData),
        timespan: this.calculateLinkedTimespan(data.linkedTimeline),
        keyPatterns: this.identifyLinkedPatterns(data)
      };

      return { success: true, data };
    } catch (error) {
      console.error('Error gathering linked data:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper methods for linked analysis
  calculateCrossEntityRiskDistribution(individualData) {
    const distribution = { low: 0, medium: 0, high: 0 };
    Object.values(individualData).forEach(data => {
      const level = data.summary.currentRiskLevel?.toLowerCase() || 'low';
      if (distribution.hasOwnProperty(level)) {
        distribution[level]++;
      }
    });
    return distribution;
  }

  calculateLinkedTimespan(linkedTimeline) {
    if (!linkedTimeline || !linkedTimeline.timeline || linkedTimeline.timeline.length === 0) {
      return null;
    }

    const events = linkedTimeline.timeline;
    const start = new Date(events[0].timestamp);
    const end = new Date(events[events.length - 1].timestamp);
    
    return {
      start,
      end,
      duration: this.formatDuration(end - start)
    };
  }

  identifyLinkedPatterns(data) {
    const patterns = [];
    
    if (data.connections.length > 0) {
      patterns.push(`${data.connections.length} temporal correlations found between entities`);
    }
    
    const entitiesWithEscalations = Object.values(data.individualData)
      .filter(entityData => entityData.summary.totalEscalations > 0).length;
    
    if (entitiesWithEscalations > 1) {
      patterns.push(`${entitiesWithEscalations} entities have been escalated`);
    }
    
    return patterns.length > 0 ? patterns : ['No significant patterns identified'];
  }
}

module.exports = new ReportGenerationService();