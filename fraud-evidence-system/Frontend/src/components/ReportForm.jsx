import { useState } from 'react';
import { reportsApi } from '../api/fraudApi';
import { format } from 'date-fns';
import FileUpload from './FileUpload';

export default function ReportForm({ session }) {
  const [entityId, setEntityId] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [caseId, setCaseId] = useState('');
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
  const [evidenceUploaded, setEvidenceUploaded] = useState(false);

  const isValidEntity = (input) => input && input.trim().length >= 3;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidEntity(entityId)) {
      setMessage('Invalid entity ID. Must be at least 3 characters.');
      return;
    }

    try {
      const { status, data } = await reportsApi.submitReport({
        wallet: entityId, // backend still expects 'wallet' field
        reason
      });

      if (status === 200 || status === 201) {
        setMessage('✅ Report submitted successfully!');
        setEntityId('');
        setReason('');
      } else if (status === 429 && data.nextAvailableAt) {
        const formatted = format(new Date(data.nextAvailableAt), 'PPpp');
        setMessage(`❌ Rate limit exceeded. You can submit again on ${formatted}.`);
      } else {
        setMessage(data.error || '❌ Failed to submit report.');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      setMessage('⚠️ Something went wrong.');
    }
  };

  const handleEvidenceUploadSuccess = (uploadResult) => {
    setEvidenceUploaded(true);
    setMessage(`✅ Evidence uploaded successfully! Hash: ${uploadResult.evidence.fileHash.substring(0, 16)}...`);
  };

  const handleEvidenceUploadError = (error) => {
    setMessage(`❌ Evidence upload failed: ${error}`);
  };

  const resetForm = () => {
    setEntityId('');
    setReason('');
    setMessage('');
    setCaseId('');
    setShowEvidenceUpload(false);
    setEvidenceUploaded(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto mt-4">
      <label className="block mb-2 font-medium">Entity ID</label>
      <input
        type="text"
        value={entityId}
        onChange={(e) => setEntityId(e.target.value)}
        className="w-full p-2 border rounded"
        placeholder="Enter user/device/email/account ID"
      />

      <label className="block mt-4 mb-2 font-medium">
        Why do you think this entity is suspicious?
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full p-2 border rounded"
        placeholder="Describe the suspicious activity..."
        rows={4}
      />

      <button
        type="submit"
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        disabled={showEvidenceUpload}
      >
        {showEvidenceUpload ? 'Report Submitted' : 'Submit Report'}
      </button>

      {/* Evidence Upload Section */}
      {showEvidenceUpload && (
        <div className="mt-6">
          <FileUpload
            caseId={caseId}
            entity={entityId}
            onUploadSuccess={handleEvidenceUploadSuccess}
            onUploadError={handleEvidenceUploadError}
          />
        </div>
      )}

      {/* Reset Form Button */}
      {evidenceUploaded && (
        <button
          type="button"
          onClick={resetForm}
          className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Submit Another Report
        </button>
      )}

      {message && (
        <p
          className={`mt-4 text-sm ${
            message.startsWith('✅') ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
