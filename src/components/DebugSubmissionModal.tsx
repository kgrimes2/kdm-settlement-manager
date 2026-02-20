/**
 * Debug Submission Modal
 *
 * Modal component for users to submit debug reports when encountering issues.
 * Collects error logs and optional user context, then submits to backend.
 */

import { useState } from 'react';
import { DebugService } from '../utils/debugService';
import type { ErrorEntry } from '../utils/errorTracking';
import './DebugSubmissionModal.css';

interface DebugSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  debugService: DebugService;
  errors: ErrorEntry[];
}

export default function DebugSubmissionModal({
  isOpen,
  onClose,
  debugService,
  errors,
}: DebugSubmissionModalProps) {
  const [userContext, setUserContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setUserContext('');
    setSubmitSuccess(false);
    setSubmissionId(null);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await debugService.submitDebugReport(
        errors,
        userContext.trim() || undefined
      );

      setSubmitSuccess(true);
      setSubmissionId(result.submission_id);
    } catch (err: any) {
      console.error('Error submitting debug report:', err);
      setError(err.message || 'Failed to submit debug report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorCount = errors.length;

  return (
    <div className="debug-modal-backdrop" onClick={handleClose}>
      <div className="debug-modal" onClick={(e) => e.stopPropagation()}>
        <div className="debug-modal-header">
          <h2>Report a Problem</h2>
          <button
            className="debug-close-btn"
            onClick={handleClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="debug-modal-body">
          {!submitSuccess ? (
            <form onSubmit={handleSubmit}>
              <div className="debug-info">
                <p>
                  Help us improve the app by reporting this issue. Your app state
                  {errorCount > 0 && ', error logs,'} and browser information will be sent securely to our servers.
                </p>
                {errorCount > 0 && (
                  <p className="debug-error-count">
                    <strong>{errorCount}</strong> error{errorCount !== 1 ? 's' : ''} will
                    be included in this report.
                  </p>
                )}
              </div>

              <div className="debug-form-group">
                <label htmlFor="userContext">
                  What issue are you experiencing? (Optional but helpful)
                </label>
                <textarea
                  id="userContext"
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  placeholder="Example: The app freezes when I try to add a new survivor, or I noticed the survival stats aren't calculating correctly..."
                  rows={4}
                  disabled={isSubmitting}
                  maxLength={1000}
                />
                <div className="debug-char-count">
                  {userContext.length}/1000 characters
                </div>
              </div>

              {error && (
                <div className="debug-error-message">
                  <strong>Error:</strong> {error}
                </div>
              )}

              <div className="debug-privacy-notice">
                <small>
                  <strong>Privacy:</strong> Your report includes app state (settlements, survivors, inventory)
                  {errorCount > 0 && ' and error logs'}. Authentication tokens and sensitive data
                  are automatically removed. Reports are deleted after 30 days.
                </small>
              </div>

              <div className="debug-modal-actions">
                <button
                  type="button"
                  onClick={handleClose}
                  className="debug-cancel-btn"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="debug-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          ) : (
            <div className="debug-success">
              <div className="debug-success-icon">✓</div>
              <h3>Report Submitted Successfully</h3>
              <p>
                Thank you for helping us improve the app! Your report including app state
                and diagnostic information has been received.
              </p>
              {submissionId && (
                <div className="debug-submission-id">
                  <strong>Submission ID:</strong>
                  <code>{submissionId}</code>
                </div>
              )}
              <p className="debug-success-note">
                If you need to follow up, please reference this submission ID.
              </p>
              <button onClick={handleClose} className="debug-close-success-btn">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
