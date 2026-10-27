const fs = require('fs');
const path = require('path');

// Files to update with their paths
const filesToUpdate = [
    'components/admin/AccessRequestsContent.tsx',
    'components/admin/AIFraudDetectionContent.tsx',
    'components/admin/DashboardContent.tsx',
    'components/admin/ComplaintsViewContent.tsx',
    'components/admin/ManualInvestigatorContent.tsx',
    'components/admin/RLEngineContent.tsx',
    'components/admin/WalletFraudAnalysis.tsx',
    'components/admin/FraudDetectionContent.tsx',
    'components/admin/InvestigatorActivityContent.tsx',
    'components/admin/InvestigatorCommunicationContent.tsx',
    'components/admin/InvestigatorStatusContent.tsx',
    'components/admin/EvidenceLibraryContent.tsx',
    'components/admin/EscalationsContent.tsx',
    'components/investigator/InvestigatorDashboard.tsx',
    'components/investigator/IncidentReportDisplay.tsx'
];

const frontendSrc = path.join(__dirname, 'frontend', 'src');
let totalUpdated = 0;
let totalFiles = 0;

filesToUpdate.forEach(relPath => {
    const filePath = path.join(frontendSrc, relPath);

    if (!fs.existsSync(filePath)) {
        console.log(`❌ File not found: ${relPath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Check if file has hardcoded URLs
    if (!content.includes('http://localhost:3000')) {
        console.log(`⏭️  No hardcoded URLs in: ${relPath}`);
        return;
    }

    // Add import if not present
    if (!content.includes('from "@/lib/api"') && !content.includes("from '@/lib/api'")) {
        // Find the last import statement
        const importRegex = /^import\s+.*?from\s+['"].*?['"];?\s*$/gm;
        const imports = content.match(importRegex);

        if (imports && imports.length > 0) {
            const lastImport = imports[imports.length - 1];
            const lastImportIndex = content.lastIndexOf(lastImport);
            const insertPosition = lastImportIndex + lastImport.length;

            content = content.slice(0, insertPosition) +
                '\nimport { apiUrl } from "@/lib/api";' +
                content.slice(insertPosition);
        }
    }

    // Replace all hardcoded URLs
    // Pattern 1: "http://localhost:3000/api/v1/..."
    content = content.replace(/"http:\/\/localhost:3000\/api\/v1\/([^"]+)"/g, 'apiUrl("$1")');

    // Pattern 2: `http://localhost:3000/api/v1/...` (template literals)
    content = content.replace(/`http:\/\/localhost:3000\/api\/v1\/([^`]+)`/g, 'apiUrl(`$1`)');

    // Save if changed
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        totalFiles++;
        const urlCount = (originalContent.match(/http:\/\/localhost:3000/g) || []).length;
        totalUpdated += urlCount;
        console.log(`✅ Updated: ${relPath} (${urlCount} URLs)`);
    } else {
        console.log(`⏭️  No changes needed: ${relPath}`);
    }
});

console.log('\n========================================');
console.log(`✅ Total files updated: ${totalFiles}`);
console.log(`✅ Total URLs replaced: ${totalUpdated}`);
console.log('========================================');
